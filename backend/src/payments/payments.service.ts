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
import { UserRole } from '../common/userRoles.enum';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}


  async processPayment(
  processPaymentDto: ProcessPaymentDto,
): Promise<Payment> {
  const {
    orderId,
    amount,
    provider,
    externalPaymentId,
    status,
  } = processPaymentDto;

  const queryRunner =
    this.dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const order = await queryRunner.manager.findOne(
      Order,
      {
        where: { order_id: orderId },
        relations: [
          'orderDetails',
          'orderDetails.appointments',
        ],
      },
    );

    if (!order) {
      throw new NotFoundException(
        `No se encontró la orden con ID: ${orderId}`,
      );
    }

    // Una orden cancelada/vencida no puede acreditarse.
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'No se puede procesar el pago de una orden cancelada o vencida',
      );
    }

    let payment =
      await queryRunner.manager.findOne(Payment, {
        where: {
          order: {
            order_id: orderId,
          },
        },
      });

    // Idempotencia:
    // si Stripe vuelve a informar el mismo pago aprobado,
    // no procesamos nuevamente la orden.
    if (
      payment?.status === PaymentStatus.PAID &&
      status === PaymentStatus.PAID
    ) {
      await queryRunner.commitTransaction();
      return payment;
    }

    if (!payment) {
      payment = queryRunner.manager.create(Payment, {
        order,
        amount: amount.toString(),
        provider,
        status,
        externalPaymentId:
          externalPaymentId ?? null,
      });
    } else {
      payment.amount = amount.toString();
      payment.provider = provider;
      payment.status = status;

      if (externalPaymentId) {
        payment.externalPaymentId =
          externalPaymentId;
      }
    }

    if (status === PaymentStatus.PAID) {
      const expectedDeposit =
        this.getOrderDeposit(order);

      // Tolerancia mínima por posibles decimales.
      if (
        Math.abs(Number(amount) - expectedDeposit) >
        0.01
      ) {
        throw new BadRequestException(
          `El monto recibido no coincide con la seña esperada de la orden`,
        );
      }

      payment.paidAt = new Date();

      order.status = OrderStatus.PAID;

      await queryRunner.manager.save(
        Order,
        order,
      );

      const appointments =
        order.orderDetails?.appointments ?? [];

      if (appointments.length === 0) {
        throw new BadRequestException(
          'La orden no contiene turnos asociados',
        );
      }

      for (const appointment of appointments) {
        // Solo confirmamos los turnos que todavía
        // están pendientes de pago.
        if (
          appointment.status ===
          AppointmentStatus.PENDING
        ) {
          appointment.status =
            AppointmentStatus.CONFIRMED;

          // Una vez pagada la seña, el turno
          // ya no debe expirar.
          appointment.expiresAt = null;

          await queryRunner.manager.save(
            Appointment,
            appointment,
          );
        }
      }
    }

    const savedPayment =
      await queryRunner.manager.save(
        Payment,
        payment,
      );

    await queryRunner.commitTransaction();

    return savedPayment;
  } catch (error) {
    await queryRunner.rollbackTransaction();

    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new BadRequestException(
      `Error al procesar el pago: ${
        (error as Error).message
      }`,
    );
  } finally {
    await queryRunner.release();
  }
}

//  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<Payment> {
//    const { orderId, amount, provider, externalPaymentId, status } =
//      processPaymentDto;
//
//    const queryRunner = this.dataSource.createQueryRunner();
//    await queryRunner.connect();
//    await queryRunner.startTransaction();
//
//    try {
//      const order = await queryRunner.manager.findOne(Order, {
//        where: { order_id: orderId },
//        relations: ['orderDetails', 'orderDetails.appointments'],
//      });
//
//      if (!order) {
//        throw new NotFoundException(
//          `No se encontró la orden con ID: ${orderId}`,
//        );
//      }
//
//      let payment = await queryRunner.manager.findOne(Payment, {
//        where: { order: { order_id: orderId } },
//      });
//
//      if (!payment) {
//        payment = queryRunner.manager.create(Payment, {
//          order,
//          amount: amount.toString(),
//          provider,
//          status,
//          externalPaymentId: externalPaymentId ?? null,
//        });
//      } else {
//        payment.amount = amount.toString();
//        payment.provider = provider;
//        payment.status = status;
//        if (externalPaymentId) {
//          payment.externalPaymentId = externalPaymentId;
//        }
//      }
//
//      if (status === PaymentStatus.PAID) {
//        payment.paidAt = new Date();
//
//        order.status = OrderStatus.PAID;
//        await queryRunner.manager.save(Order, order);
//
//        if (order.orderDetails && order.orderDetails.appointments) {
//          for (const appointment of order.orderDetails.appointments) {
//            appointment.status = AppointmentStatus.CONFIRMED;
//            await queryRunner.manager.save(Appointment, appointment);
//          }
//        }
//      }
//
//      const savedPayment = await queryRunner.manager.save(Payment, payment);
//
//      await queryRunner.commitTransaction();
//
//      return savedPayment;
//    } catch (error) {
//      await queryRunner.rollbackTransaction();
//      if (error instanceof NotFoundException) {
//        throw error;
//      }
//      throw new BadRequestException(
//        `Error al procesar el pago: ${(error as Error).message}`,
//      );
//    } finally {
//      await queryRunner.release();
//    }
//  }

  //async createStripeIntent(orderId: string) {
  //  const order = await this.dataSource.getRepository(Order).findOne({
  //    where: { order_id: orderId },
  //    relations: ['orderDetails', 'orderDetails.appointments'],
  //  });
//
  //  if (!order) {
  //    throw new NotFoundException(`No se encontró la orden con ID: ${orderId}`);
  //  }
//
  //  const amount = this.getOrderDeposit(order);
//
  //  const intent = await this.stripe.paymentIntents.create({
  //    amount: Math.round(amount * 100),
  //    currency: 'ars',
  //    automatic_payment_methods: {
  //      enabled: true,
  //    },
  //    metadata: {
  //      orderId,
  //    },
  //  });
//
  //  return {
  //    clientSecret: intent.client_secret,
  //  };
  //}

  async createStripeIntent(
  orderId: string,
  userId: string,
  roles: UserRole[],
) {
  const orderRepository =
    this.dataSource.getRepository(Order);

  const order = await orderRepository.findOne({
    where: { order_id: orderId },
    relations: [
      'user',
      'orderDetails',
      'orderDetails.appointments',
    ],
  });

  if (!order) {
    throw new NotFoundException(
      `No se encontró la orden con ID: ${orderId}`,
    );
  }

  const isAdmin = roles.includes(UserRole.ADMIN);

  if (!isAdmin && order.user.id !== userId) {
    throw new NotFoundException(
      `No se encontró la orden con ID: ${orderId}`,
    );
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new BadRequestException(
      'No se puede pagar una orden cancelada o vencida',
    );
  }

  if (order.status === OrderStatus.PAID) {
    throw new BadRequestException(
      'La orden ya se encuentra abonada',
    );
  }

  const pendingAppointments =
    order.orderDetails?.appointments?.filter(
      (appointment) =>
        appointment.status === AppointmentStatus.PENDING,
    ) ?? [];

  if (pendingAppointments.length === 0) {
    throw new BadRequestException(
      'La orden no contiene turnos pendientes de pago',
    );
  }

  // Todos los turnos creados dentro de una misma Order
  // comparten el mismo plazo de expiración.
  const now = new Date();

  const orderExpired = pendingAppointments.some(
    (appointment) =>
      appointment.expiresAt !== null &&
      appointment.expiresAt <= now,
  );

  if (orderExpired) {
    await this.dataSource.transaction(async (manager) => {
      for (const appointment of pendingAppointments) {
        appointment.status = AppointmentStatus.EXPIRED;
        appointment.expiresAt = null;

        await manager.save(
          Appointment,
          appointment,
        );
      }

      order.status = OrderStatus.CANCELLED;

      await manager.save(Order, order);
    });

    throw new BadRequestException(
      'La orden venció. Debe realizar una nueva reserva',
    );
  }

  const amount = this.getOrderDeposit(order);

  const intent =
    await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'ars',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
      },
    });

  return {
    clientSecret: intent.client_secret,
  };
}

  //async handleStripeWebhook(rawBody: Buffer, signature: string) {
  //  let event: Stripe.Event;
  //  try {
  //    event = this.stripe.webhooks.constructEvent(
  //      rawBody,
  //      signature,
  //      process.env.STRIPE_WEBHOOK_SECRET!,
  //    );
  //  } catch {
  //    throw new BadRequestException('Firma de webhook inválida');
  //  }
//
  //  if (event.type === 'payment_intent.succeeded') {
  //    const intent = event.data.object as any;
  //    const orderId = intent.metadata?.orderId;
//
  //    // 💡 FILTRO PROTECTOR: Si Stripe manda un evento de prueba genérico
  //    // sin metadata real, respondemos éxito directo para evitar el crash 404.
  //    if (
  //      !orderId ||
  //      orderId.startsWith('pi_') ||
  //      orderId === 'prueba_manual'
  //    ) {
  //      console.log(
  //        '💰 [Stripe Webhook] Simulación exitosa (Bypass de validación).',
  //      );
  //      return { received: true };
  //    }
//
  //    // Si es un ID real de tu sistema, intentamos procesar la base de datos
  //    try {
  //      await this.processPayment({
  //        orderId: orderId,
  //        amount: intent.amount_received / 100,
  //        provider: 'stripe',
  //        externalPaymentId: intent.id,
  //        status: PaymentStatus.PAID,
  //      });
  //    } catch (error: any) {
  //      // 💡 PROTECCIÓN MÁXIMA PARA LA ENTREGA: Si tu método processPayment falla
  //      // porque la orden de pgAdmin no tiene filas hijas en order_details o appointments,
  //      // atrapamos el error acá. Así tu API devuelve un código exitoso a Stripe y el flujo avanza.
  //      console.log(
  //        '⚠️ [Stripe Webhook] Pago aprobado, pero saltó restricción relacional en BD:',
  //        error.message,
  //      );
  //      return { received: true };
  //    }
  //  }
//
  //  return { received: true };
  //}

  async handleStripeWebhook(
  rawBody: Buffer,
  signature: string,
) {
  let event: Stripe.Event;

  try {
    event =
      this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
  } catch {
    throw new BadRequestException(
      'Firma de webhook inválida',
    );
  }

  if (
    event.type ===
    'payment_intent.succeeded'
  ) {
    const intent =
      event.data.object as Stripe.PaymentIntent;

    const orderId =
      intent.metadata?.orderId;

    if (!orderId) {
      throw new BadRequestException(
        'El pago recibido no contiene una orden asociada',
      );
    }

    await this.processPayment({
      orderId,
      amount: intent.amount_received / 100,
      provider: 'stripe',
      externalPaymentId: intent.id,
      status: PaymentStatus.PAID,
    });
  }

  return {
    received: true,
  };
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
        'order.user',
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
      relations: ['order', 'order.user'],
    });
  }
}
