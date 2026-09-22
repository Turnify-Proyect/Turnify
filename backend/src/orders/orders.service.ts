import { Injectable } from '@nestjs/common';
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

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Reutilizamos las validaciones existentes de Appointment:
    // usuario, profesional, servicio, disponibilidad y superposición.
    // Este método todavía no guarda nada.
    // comentado por: Lautaro-dev
    const { user, professional, service, startAt, endAt, expiresAt } =
      await this.appointmentsRepository.prepareAppointment({
        userId,
        professionalId: createOrderDto.professionalId,
        serviceId: createOrderDto.serviceId,
        startAt: createOrderDto.startAt,
      });

    // Order + OrderDetail + Appointment deben crearse como una única operación.
    // Si alguno de los inserts falla, la transacción revierte los anteriores.
    // comentado por: Lautaro-dev
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        user,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(Order, order);

      // El precio se obtiene del Service guardado en la base de datos.
      // Nunca confiamos en un precio enviado por el frontend.
      // comentado por: Lautaro-dev
      const orderDetail = manager.create(OrderDetail, {
        order: savedOrder,
        total_price: Number(service.price),
      });

      const savedOrderDetail = await manager.save(OrderDetail, orderDetail);

      const appointment = manager.create(Appointment, {
        user,
        professional,
        service,
        orderDetail: savedOrderDetail,
        startAt,
        endAt,
        status: AppointmentStatus.PENDING,
        expiresAt,
      });

      const savedAppointment = await manager.save(Appointment, appointment);

      return {
        orderId: savedOrder.order_id,
        status: savedOrder.status,
        totalPrice: Number(savedOrderDetail.total_price),
        appointment: {
          id: savedAppointment.id,
          status: savedAppointment.status,
          startAt: savedAppointment.startAt,
          endAt: savedAppointment.endAt,
          expiresAt: savedAppointment.expiresAt,
        },
      };
    });
  }
}
