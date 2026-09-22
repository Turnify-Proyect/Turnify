import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Stripe from 'stripe';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  );

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<Payment> {
    const { orderId, amount, provider, externalPaymentId, status } =
      processPaymentDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { order_id: orderId },
        relations: ['orderDetails', 'orderDetails.appointments'],
      });

      if (!order) {
        throw new NotFoundException(
          `No se encontró la orden con ID: ${orderId}`,
        );
      }

      let payment = await queryRunner.manager.findOne(Payment, {
        where: {
          order: {
            order_id: orderId,
          },
        },
        relations: [
          'order',
          'order.orderDetails',
          'order.orderDetails.appointments',
        ],
      });

      // Stripe puede reenviar un mismo webhook.
      // Si este pago ya fue confirmado con el mismo ID externo,
      // devolvemos el registro existente sin procesarlo nuevamente.
      // comentado por: Lautaro-dev
      if (payment?.status === PaymentStatus.PAID) {
        if (
          externalPaymentId &&
          payment.externalPaymentId === externalPaymentId
        ) {
          await queryRunner.commitTransaction();
          return payment;
        }

        throw new BadRequestException('La orden ya posee un pago confirmado');
      }

      // Antes de confirmar un pago verificamos que los turnos asociados
      // todavía se encuentren dentro del tiempo válido de reserva.
      // Esto evita confirmar un turno cuyo período de pago ya venció.
      // comentado por: Lautaro-dev
      if (status === PaymentStatus.PAID) {
        const appointments = order.orderDetails?.appointments;

        if (!appointments || appointments.length === 0) {
          throw new BadRequestException('La orden no tiene turnos asociados');
        }

        const now = new Date();

        for (const appointment of appointments) {
          if (
            appointment.status === AppointmentStatus.EXPIRED ||
            (appointment.status === AppointmentStatus.PENDING &&
              appointment.expiresAt &&
              appointment.expiresAt <= now)
          ) {
            throw new BadRequestException(
              'No se puede confirmar el pago porque el turno asociado ya expiró',
            );
          }

          if (appointment.status === AppointmentStatus.CANCELLED) {
            throw new BadRequestException(
              'No se puede confirmar el pago de un turno cancelado',
            );
          }
        }
      }

      if (!payment) {
        payment = queryRunner.manager.create(Payment, {
          order,
          amount: amount.toString(),
          provider,
          status,
          externalPaymentId: externalPaymentId ?? null,
        });
      } else {
        payment.amount = amount.toString();
        payment.provider = provider;
        payment.status = status;
        if (externalPaymentId) {
          payment.externalPaymentId = externalPaymentId;
        }
      }

      if (status === PaymentStatus.PAID) {
        payment.paidAt = new Date();

        order.status = OrderStatus.PAID;
        await queryRunner.manager.save(Order, order);

        if (order.orderDetails && order.orderDetails.appointments) {
          for (const appointment of order.orderDetails.appointments) {
            appointment.status = AppointmentStatus.CONFIRMED;

            // Una vez confirmado el pago, el turno deja de ser una reserva temporal,
            // por lo tanto ya no debe conservar una fecha de expiración.
            // comentado por: Lautaro-dev
            appointment.expiresAt = null;

            await queryRunner.manager.save(Appointment, appointment);
          }
        }
      }

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

      // Después de confirmar la transacción volvemos a consultar el pago
      // con sus relaciones para devolver los estados reales y actualizados
      // de Order y Appointment.
      // comentado por: Lautaro-dev
      const updatedPayment = await this.paymentRepository.findOne({
        where: { id: savedPayment.id },
        relations: [
          'order',
          'order.orderDetails',
          'order.orderDetails.appointments',
        ],
      });

      if (!updatedPayment) {
        throw new NotFoundException(
          'El pago fue procesado pero no pudo recuperarse posteriormente',
        );
      }

      return updatedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Error al procesar el pago: ${(error as Error).message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async createStripeIntent(orderId: string, userId: string) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: {
        order_id: orderId,
        user: {
          id: userId,
        },
      },
      relations: ['user', 'orderDetails', 'orderDetails.appointments'],
    });

    if (!order) {
      throw new NotFoundException(
        'La orden no existe o no pertenece al usuario autenticado',
      );
    }

    // Solo una orden pendiente puede iniciar un proceso de pago.
    // Evita volver a generar PaymentIntents para órdenes ya pagadas
    // o canceladas.
    // comentado por: Lautaro-dev
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'La orden no se encuentra pendiente de pago',
      );
    }

    const appointments = order.orderDetails?.appointments;

    if (!appointments || appointments.length === 0) {
      throw new BadRequestException('La orden no tiene turnos asociados');
    }

    const now = new Date();

    // El PaymentIntent solamente puede generarse mientras la reserva
    // temporal siga vigente.
    // comentado por: Lautaro-dev
    for (const appointment of appointments) {
      if (
        appointment.status !== AppointmentStatus.PENDING ||
        !appointment.expiresAt ||
        appointment.expiresAt <= now
      ) {
        throw new BadRequestException(
          'La reserva asociada a la orden ya no se encuentra disponible para pagar',
        );
      }
    }

    const amount = this.getOrderDeposit(order);

    // Utilizamos el ID de la orden como clave de idempotencia.
    // De esta manera, si el cliente repite la petición por doble click,
    // refresh o problemas de red, Stripe reutiliza el mismo PaymentIntent
    // en lugar de generar varios intentos de pago para una misma orden.
    // comentado por: Lautaro-dev
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: 'ars',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
        },
      },
      {
        idempotencyKey: `turnify-order-${orderId}`,
      },
    );

    return {
      clientSecret: intent.client_secret,
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      const orderId = intent.metadata?.orderId;

      // 💡 FILTRO PROTECTOR: Si Stripe manda un evento de prueba genérico
      // sin metadata real, respondemos éxito directo para evitar el crash 404.
      if (
        !orderId ||
        orderId.startsWith('pi_') ||
        orderId === 'prueba_manual'
      ) {
        console.log(
          '💰 [Stripe Webhook] Simulación exitosa (Bypass de validación).',
        );
        return { received: true };
      }

      // Si Stripe confirmó el pago, procesamos la operación en nuestra BD.
      // Si esta operación falla, NO ocultamos el error: el webhook debe fallar
      // para que Stripe pueda volver a intentar entregarlo.
      // comentado por: Lautaro-dev
      await this.processPayment({
        orderId,
        amount: intent.amount_received / 100,
        provider: 'stripe',
        externalPaymentId: intent.id,
        status: PaymentStatus.PAID,
      });
    }

    return { received: true };
  }

  private getOrderTotal(order: Order): number {
    const total = Number(order.orderDetails?.total_price);

    if (!Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('La orden no tiene un precio válido');
    }

    return total;
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: [
        'order',
        'order.orderDetails',
        'order.orderDetails.appointments',
      ],
    });

    if (!payment) {
      throw new NotFoundException(
        'No se encontró un registro de pago con el ID proporcionado',
      );
    }

    return payment;
  }
  // AJUSTAR: tiene que ser el mismo porcentaje que usa el front para la seña
  private static readonly DEPOSIT_RATE = 0.3;

  private getOrderDeposit(order: Order): number {
    const total = Number(order.orderDetails?.total_price);
    if (!Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('La orden no tiene un precio válido');
    }
    return Math.round(total * PaymentsService.DEPOSIT_RATE * 100) / 100;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['order'],
    });
  }
}
