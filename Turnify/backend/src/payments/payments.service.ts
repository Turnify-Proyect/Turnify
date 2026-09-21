import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';
import Stripe from 'stripe'; // 👈 1. Importamos la librería de Stripe

@Injectable()
export class PaymentsService {
  private stripe: Stripe; // 👈 2. Declaramos la instancia de Stripe

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {
    // 👈 3. Inicializamos Stripe leyendo tu variable de entorno
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27' as any, 
    });
  }

  async processPayment(processPaymentDto: ProcessPaymentDto): Promise<any> { // Change to return any to support clientSecret
    const { orderId, amount, provider, externalPaymentId, status } =
      processPaymentDto;

    // 👈 4. INTERCEPCIÓN PARA STRIPE: Generación del Intento de Pago
    let stripeClientSecret: string | null = null;
    let finalExternalId = externalPaymentId;

    if (provider === 'stripe' && status === PaymentStatus.PENDING) {
      try {
        // Stripe trabaja en centavos y requiere enteros (ej: 45.00 -> 4500)
        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd', // Cambia a tu moneda local si usas otra (ars, mxn, eur, etc.)
          automatic_payment_methods: { enabled: true },
          metadata: { orderId: orderId }, // Guardamos el ID de la orden como referencia en Stripe
        });

        stripeClientSecret = paymentIntent.client_secret;
        finalExternalId = paymentIntent.id; // Guardamos el 'pi_...' oficial de Stripe en tu base de datos
      } catch (stripeError) {
        throw new BadRequestException(
          `Error al inicializar la pasarela de Stripe: ${(stripeError as Error).message}`,
        );
      }
    }

    // A partir de aquí corre tu excelente lógica transaccional intacta 🚀
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Nota: Tu entidad Order expone la propiedad 'order_id' según tu .findOne()
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
        where: { order: { order_id: orderId } },
      });

      if (!payment) {
        payment = queryRunner.manager.create(Payment, {
          order,
          amount: amount.toString(),
          provider,
          status,
          externalPaymentId: finalExternalId ?? null, // Usa el id de Stripe si aplica
        });
      } else {
        payment.amount = amount.toString();
        payment.provider = provider;
        payment.status = status;
        if (finalExternalId) {
          payment.externalPaymentId = finalExternalId;
        }
      }

      if (status === PaymentStatus.PAID) {
        payment.paidAt = new Date();

        order.status = OrderStatus.PAID;
        await queryRunner.manager.save(Order, order);

        if (order.orderDetails && order.orderDetails.appointments) {
          for (const appointment of order.orderDetails.appointments) {
            appointment.status = AppointmentStatus.CONFIRMED;
            await queryRunner.manager.save(Appointment, appointment);
          }
        }
      }

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

      // 👈 5. RETORNO ENRIQUECIDO: Si es una petición inicial de Stripe, le adjuntamos el clientSecret para React
      if (stripeClientSecret) {
        return {
          ...savedPayment,
          clientSecret: stripeClientSecret,
        };
      }

      return savedPayment;
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

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['order', 'order.user'],
    });
  }

    // 💡 Agrega este método dentro de la clase PaymentsService
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      // Validamos que la petición venga realmente de Stripe usando tu secreto del webhook
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: any) {
      throw new BadRequestException(`Firma del webhook inválida: ${err.message}`);
    }

    // Si el pago fue exitoso, procesamos la orden para marcarla como PAID y confirmar turnos
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const orderId = paymentIntent.metadata.orderId;
      const amount = paymentIntent.amount / 100; // Convertimos centavos a decimal (ej: 2500 -> 25.00)

      if (orderId) {
        console.log(`¡Pago confirmado por Stripe para la orden: ${orderId}! Actualizando base de datos...`);
        
        // Llamamos a tu lógica transaccional atómica
        await this.processPayment({
          orderId: orderId,
          amount: amount,
          provider: 'stripe',
          externalPaymentId: paymentIntent.id,
          status: PaymentStatus.PENDING, // Tu service cambiará esto internamente a PAID en el bloque condicional
        });
      }
    }
  }
}
