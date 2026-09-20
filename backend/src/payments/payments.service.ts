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

@Injectable()
export class PaymentsService {
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
        where: { order: { order_id: orderId } },
      });

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
            await queryRunner.manager.save(Appointment, appointment);
          }
        }
      }

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

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
}
