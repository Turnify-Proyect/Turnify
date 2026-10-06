import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Stripe from 'stripe';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Payment, PaymentStatus, PaymentType } from './entities/payment.entity';
import { ProcessCashPaymentDto } from './dto/process-cash-payment.dto';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  );
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    private readonly dataSource: DataSource,

    private readonly notificationsService: NotificationsService,
  ) {}

  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<Payment> {
    const {
      orderId,
      amount,
      provider,
      externalPaymentId,
      status,
      paymentType,
    } = processPaymentDto;

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
          paymentType: paymentType ?? null,
        });
      } else {
        payment.amount = amount.toString();
        payment.provider = provider;
        payment.status = status;

        if (externalPaymentId) {
          payment.externalPaymentId = externalPaymentId;
        }

        if (paymentType) {
          payment.paymentType = paymentType;
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
        // Recuperamos el pago con todas las relaciones necesarias
        // para construir posteriormente la notificación de confirmación.
        //comentado por Lautaro-dev
        relations: [
          'order',
          'order.user',
          'order.orderDetails',
          'order.orderDetails.appointments',
          'order.orderDetails.appointments.service',
          'order.orderDetails.appointments.professional',
          'order.orderDetails.appointments.professional.user',
        ],
      });

      if (!updatedPayment) {
        throw new NotFoundException(
          'El pago fue procesado pero no pudo recuperarse posteriormente',
        );
      }

      if (status === PaymentStatus.PAID) {
        // Preparamos los datos de los turnos confirmados con la información
        // necesaria para construir el correo de confirmación.
        //comentado por Lautaro-dev
        const appointmentsForNotification =
          updatedPayment.order.orderDetails.appointments.map((appointment) => ({
            serviceName: appointment.service.name,
            professionalName: appointment.professional.user.name,
            startAt: appointment.startAt,
            durationMinutes: appointment.service.durationMinutes,
          }));

        // Convertimos los valores decimales almacenados en la base de datos
        // a number antes de enviarlos al servicio de notificaciones.
        //comentado por Lautaro-dev
        const depositAmount = Number(updatedPayment.amount);

        const totalAmount = Number(
          updatedPayment.order.orderDetails.total_price,
        );

        // El correo se envía únicamente cuando el pago quedó confirmado.
        //comentado por Lautaro-dev
        try {
          await this.notificationsService.sendOrderConfirmed(
            updatedPayment.order.user.email,
            updatedPayment.order.user.name,
            appointmentsForNotification,
            depositAmount,
            totalAmount,
            updatedPayment.paymentType,
          );
        } catch (error) {
          this.logger.error(
            'El pago fue confirmado pero no se pudo enviar el correo de confirmación',
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      return updatedPayment;
    } catch (error) {
      // Solo revierte la transacción si todavía continúa activa.
      //comentado por Lautaro-dev
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        `Error al procesar el pago: ${
          error instanceof Error ? error.message : String(error)
        }`,
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

  // Si Stripe confirma un pago después de que venció la reserva,
  // devolvemos automáticamente el dinero y dejamos toda la operación
  // reflejada correctamente en nuestra base de datos.
  // comentado por: Lautaro-dev
  private async refundExpiredOrder(
    order: Order,
    paymentIntentId: string,
    amount: number,
  ): Promise<void> {
    // La clave de idempotencia evita generar más de un reembolso
    // si Stripe reenvía el mismo webhook.
    // comentado por: Lautaro-dev
    await this.stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
      },
      {
        idempotencyKey: `turnify-refund-${paymentIntentId}`,
      },
    );

    await this.dataSource.transaction(async (manager) => {
      let payment = await manager.findOne(Payment, {
        where: {
          order: {
            order_id: order.order_id,
          },
        },
      });

      if (!payment) {
        payment = manager.create(Payment, {
          order,
          provider: 'stripe',
          externalPaymentId: paymentIntentId,
          amount: amount.toString(),
          status: PaymentStatus.REFUNDED,

          // El dinero llegó a cobrarse antes de ser reembolsado,
          // por eso conservamos la fecha en la que se procesó.
          // comentado por: Lautaro-dev
          paidAt: new Date(),
        });
      } else {
        payment.provider = 'stripe';
        payment.externalPaymentId = paymentIntentId;
        payment.amount = amount.toString();
        payment.status = PaymentStatus.REFUNDED;

        if (!payment.paidAt) {
          payment.paidAt = new Date();
        }
      }

      await manager.save(Payment, payment);

      order.status = OrderStatus.CANCELLED;
      await manager.save(Order, order);

      const appointments = order.orderDetails?.appointments ?? [];

      for (const appointment of appointments) {
        appointment.status = AppointmentStatus.EXPIRED;
        appointment.expiresAt = null;

        await manager.save(Appointment, appointment);
      }
    });
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
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;

      // Ignoramos únicamente eventos de prueba genéricos que no pertenecen
      // a una orden real de Turnify.
      // comentado por: Lautaro-dev
      if (
        !orderId ||
        orderId.startsWith('pi_') ||
        orderId === 'prueba_manual'
      ) {
        return { received: true };
      }

      const order = await this.dataSource.getRepository(Order).findOne({
        where: {
          order_id: orderId,
        },
        relations: ['orderDetails', 'orderDetails.appointments'],
      });

      if (!order) {
        throw new NotFoundException(
          `No se encontró la orden con ID: ${orderId}`,
        );
      }

      const amount = intent.amount_received / 100;

      // Si la orden ya fue pagada, delegamos nuevamente en processPayment().
      // Ese método ya es idempotente y devolverá el mismo Payment si Stripe
      // reenvía el mismo evento.
      // comentado por: Lautaro-dev
      if (order.status === OrderStatus.PAID) {
        await this.processPayment({
          orderId,
          amount,
          provider: 'stripe',
          externalPaymentId: intent.id,
          status: PaymentStatus.PAID,
          paymentType: PaymentType.DEPOSIT_PAYMENT,
        });

        return { received: true };
      }

      const appointments = order.orderDetails?.appointments ?? [];
      const now = new Date();

      const reservationExpiredOrUnavailable =
        appointments.length === 0 ||
        order.status === OrderStatus.CANCELLED ||
        appointments.some(
          (appointment) =>
            appointment.status === AppointmentStatus.EXPIRED ||
            appointment.status === AppointmentStatus.CANCELLED ||
            appointment.status !== AppointmentStatus.PENDING ||
            !appointment.expiresAt ||
            appointment.expiresAt <= now,
        );

      // Stripe ya confirmó el cobro. Si la reserva dejó de ser válida,
      // no podemos simplemente rechazar el webhook porque el dinero ya
      // fue cobrado: se realiza un reembolso automático.
      // comentado por: Lautaro-dev
      if (reservationExpiredOrUnavailable) {
        await this.refundExpiredOrder(order, intent.id, amount);

        return { received: true };
      }

      // Reserva vigente: registramos el pago, marcamos la orden como PAID
      // y confirmamos el turno.
      // comentado por: Lautaro-dev
      await this.processPayment({
        orderId,
        amount,
        provider: 'stripe',
        externalPaymentId: intent.id,
        status: PaymentStatus.PAID,
        paymentType: PaymentType.DEPOSIT_PAYMENT,
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


  //--- checkout desde el admin, para que el admin pueda generar un link de pago para el cliente
  async createAdminCheckoutSession(orderId: string) {
  const order = await this.dataSource
    .getRepository(Order)
    .findOne({
      where: {
        order_id: orderId,
      },
      relations: [
        'user',
        'orderDetails',
        'orderDetails.appointments',
        'orderDetails.appointments.service',
        'orderDetails.appointments.professional',
        'orderDetails.appointments.professional.user',
      ],
    });

  if (!order) {
    throw new NotFoundException(
      'No se encontró la orden',
    );
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException(
      'La orden no se encuentra pendiente de pago',
    );
  }

  const appointments =
    order.orderDetails?.appointments;

  if (
    !appointments ||
    appointments.length === 0
  ) {
    throw new BadRequestException(
      'La orden no tiene turnos asociados',
    );
  }

  const now = new Date();

  for (const appointment of appointments) {
    if (
      appointment.status !==
        AppointmentStatus.PENDING ||
      !appointment.expiresAt ||
      appointment.expiresAt <= now
    ) {
      throw new BadRequestException(
        'La reserva asociada ya no se encuentra disponible para pagar',
      );
    }
  }

  const amount = this.getOrderDeposit(order);

  const sessionExpiresAt =
    Math.floor(Date.now() / 1000) +
    30 * 60;

  const frontendUrl =
    process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new BadRequestException(
      'No se encuentra configurada la URL del frontend',
    );
  }

  const session =
    await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',

        customer_email: order.user.email,

        client_reference_id: orderId,

        line_items: [
          {
            price_data: {
              currency: 'ars',

              product_data: {
                name: 'Seña de reserva - Turnify',
              },

              unit_amount:
                Math.round(amount * 100),
            },

            quantity: 1,
          },
        ],

        metadata: {
          orderId,
        },

        payment_intent_data: {
          metadata: {
            orderId,
          },
        },

        expires_at: sessionExpiresAt,

        success_url:
          `${frontendUrl}/payment/success`,

        cancel_url:
          `${frontendUrl}/payment/pending`,
      },
      {
        idempotencyKey:
          `turnify-admin-checkout-${orderId}`,
      },
    );

  if (!session.url) {
    throw new BadRequestException(
      'Stripe no generó el enlace de pago',
    );
  }

  
  const expiresAt =
    new Date(sessionExpiresAt * 1000);

  await this.dataSource.transaction(
    async (manager) => {
      for (const appointment of appointments) {
        appointment.expiresAt = expiresAt;

        await manager.save(
          Appointment,
          appointment,
        );
      }
    },
  );

  const appointmentsForNotification =
  appointments.map((appointment) => ({
    serviceName: appointment.service.name,
    professionalName:
      appointment.professional.user.name,
    startAt: appointment.startAt,
    durationMinutes:
      appointment.service.durationMinutes,
  }));

let emailSent = true;

try {
  await this.notificationsService.sendPaymentLink(
    order.user.email,
    order.user.name,
    appointmentsForNotification,
    amount,
    session.url,
    expiresAt,
  );
} catch (error) {
  emailSent = false;

  this.logger.error(
    'Se generó el link de pago pero no pudo enviarse el correo',
    error instanceof Error
      ? error.stack
      : undefined,
  );
}

  return {
  orderId,
  checkoutUrl: session.url,
  expiresAt,
  email: order.user.email,
  depositAmount: amount,
  emailSent,
};
}
}
