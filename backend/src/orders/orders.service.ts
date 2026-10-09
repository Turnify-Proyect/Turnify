import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { OrderStatus } from './enums/order-status.enum';

import { AppointmentsRepository } from '../appointments/appointments.repository';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';

type PreparedOrderAppointment = Awaited<
  ReturnType<AppointmentsRepository['prepareAppointment']>
>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const preparedAppointments: PreparedOrderAppointment[] = await Promise.all(
      createOrderDto.appointments.map((item) =>
        this.appointmentsRepository.prepareAppointment({
          userId,
          professionalId: item.professionalId,
          serviceId: item.serviceId,
          startAt: item.startAt,
        }),
      ),
    );

    this.validateInternalOverlaps(preparedAppointments);

    const totalPrice = preparedAppointments.reduce(
      (total, item) => total + Number(item.service.price),
      0,
    );

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new ConflictException(
        'No se pudo calcular un precio válido para la orden',
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return this.dataSource.transaction(async (manager) => {
      const user = preparedAppointments[0].user;

      const order = manager.create(Order, {
        user,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(Order, order);

      const orderDetail = manager.create(OrderDetail, {
        order: savedOrder,
        total_price: totalPrice,
      });

      const savedOrderDetail = await manager.save(OrderDetail, orderDetail);

      const appointments = preparedAppointments.map((prepared) =>
        manager.create(Appointment, {
          user: prepared.user,
          professional: prepared.professional,
          service: prepared.service,
          orderDetail: savedOrderDetail,
          startAt: prepared.startAt,
          endAt: prepared.endAt,
          status: AppointmentStatus.PENDING,
          expiresAt,
        }),
      );

      const savedAppointments = await manager.save(Appointment, appointments);

      return {
        orderId: savedOrder.order_id,
        status: savedOrder.status,
        totalPrice,
        appointments: savedAppointments.map((appointment) => ({
          id: appointment.id,
          status: appointment.status,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          expiresAt: appointment.expiresAt,
        })),
      };
    });
  }

  private validateInternalOverlaps(
    appointments: PreparedOrderAppointment[],
  ): void {
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const first = appointments[i];
        const second = appointments[j];

        const overlaps =
          first.startAt < second.endAt && first.endAt > second.startAt;

        if (overlaps) {
          throw new ConflictException(
            'La orden contiene turnos con horarios superpuestos',
          );
        }
      }
    }
  }
}
