import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
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
    /*
     * Preparamos todos los turnos reutilizando las validaciones
     * existentes de Appointment.
     */
    const preparedAppointments: PreparedOrderAppointment[] =
      await Promise.all(
        createOrderDto.appointments.map((item) =>
          this.appointmentsRepository.prepareAppointment({
            userId,
            professionalId: item.professionalId,
            serviceId: item.serviceId,
            startAt: item.startAt,
          }),
        ),
      );

    /*
     * prepareAppointment valida contra los turnos que ya existen
     * en la BD, pero estos nuevos turnos todavía no fueron guardados.
     * Por eso también validamos que no se superpongan entre ellos.
     */
    this.validateInternalOverlaps(preparedAppointments);

    /*
     * El precio se calcula exclusivamente con los servicios
     * obtenidos desde la base de datos.
     */
    const totalPrice = preparedAppointments.reduce(
      (total, item) => total + Number(item.service.price),
      0,
    );

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new ConflictException(
        'No se pudo calcular un precio válido para la orden',
      );
    }

    /*
     * Todos los turnos pertenecientes a la misma orden
     * comparten el mismo vencimiento para completar el pago.
     */
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    /*
     * Order + OrderDetail + Appointments se crean dentro
     * de una única transacción.
     */
    return this.dataSource.transaction(async (manager) => {
      const user = preparedAppointments[0].user;

      const order = manager.create(Order, {
        user,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(Order, order);

      /*
       * Una orden tiene un único OrderDetail con el total
       * de todos los servicios seleccionados.
       */
      const orderDetail = manager.create(OrderDetail, {
        order: savedOrder,
        total_price: totalPrice,
      });

      const savedOrderDetail = await manager.save(
        OrderDetail,
        orderDetail,
      );

      /*
       * Creamos todos los turnos asociados al mismo OrderDetail.
       */
      const appointments = preparedAppointments.map(
        (prepared) =>
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

      const savedAppointments = await manager.save(
        Appointment,
        appointments,
      );

      return {
        orderId: savedOrder.order_id,
        status: savedOrder.status,
        totalPrice,
        appointments: savedAppointments.map(
          (appointment) => ({
            id: appointment.id,
            status: appointment.status,
            startAt: appointment.startAt,
            endAt: appointment.endAt,
            expiresAt: appointment.expiresAt,
          }),
        ),
      };
    });
  }

  /*
   * Valida que los turnos incluidos en la misma orden
   * no se superpongan entre sí.
   */
  private validateInternalOverlaps(
    appointments: PreparedOrderAppointment[],
  ): void {
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const first = appointments[i];
        const second = appointments[j];

        const overlaps =
          first.startAt < second.endAt &&
          first.endAt > second.startAt;

        if (overlaps) {
          throw new ConflictException(
            'La orden contiene turnos con horarios superpuestos',
          );
        }
      }
    }
  }
}