import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

import { CreateOrderDto } from './dto/create-order.dto';

import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';

import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';

import { User } from '../users/entities/user.entity';

import { AppointmentsRepository } from '../appointments/appointments.repository';

type PreparedOrderAppointment = {
  user: User;
  professional: any;
  service: any;
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    /*
     * Primero preparamos todos los turnos.
     *
     * prepareAppointment valida:
     * - usuario
     * - rol cliente
     * - profesional
     * - servicio
     * - relación profesional/servicio
     * - fecha
     * - disponibilidad
     * - superposición contra la base de datos
     */
    const preparedAppointments: PreparedOrderAppointment[] = [];

    for (const appointmentDto of createOrderDto.appointments) {
      const prepared =
        await this.appointmentsRepository.prepareAppointment(
          userId,
          appointmentDto.professionalId,
          appointmentDto.serviceId,
          appointmentDto.startAt,
        );

      preparedAppointments.push(prepared);
    }

    /*
     * Los turnos anteriores todavía no existen en la BD.
     * Por eso necesitamos verificar también que los turnos
     * de esta misma orden no se superpongan entre ellos.
     */
    this.validateInternalOverlaps(preparedAppointments);

    /*
     * El precio siempre se calcula desde los servicios
     * obtenidos de la base de datos.
     */
    const totalPrice = preparedAppointments.reduce(
      (total, appointment) => {
        return total + Number(appointment.service.price);
      },
      0,
    );

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new ConflictException(
        'No se pudo calcular un precio válido para la orden',
      );
    }

    /*
     * Todos los turnos de una misma orden comparten
     * el mismo vencimiento para completar el pago.
     */
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    const queryRunner =
      this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(
        User,
        {
          where: {
            id: userId,
          },
        },
      );

      if (!user) {
        throw new NotFoundException(
          'No existe un usuario con el ID proporcionado',
        );
      }

      /*
       * 1. Crear Order
       */
      const order = queryRunner.manager.create(
        Order,
        {
          user,
        },
      );

      const savedOrder =
        await queryRunner.manager.save(Order, order);

      /*
       * 2. Crear un único OrderDetail
       */
      const orderDetail = queryRunner.manager.create(
        OrderDetail,
        {
          order: savedOrder,
          total_price: totalPrice,
        },
      );

      const savedOrderDetail =
        await queryRunner.manager.save(
          OrderDetail,
          orderDetail,
        );

      /*
       * 3. Crear todos los Appointments asociados
       * al mismo OrderDetail.
       */
      const appointments =
        preparedAppointments.map((prepared) =>
          queryRunner.manager.create(
            Appointment,
            {
              user,
              professional: prepared.professional,
              service: prepared.service,
              orderDetail: savedOrderDetail,
              startAt: prepared.startAt,
              endAt: prepared.endAt,
              status: AppointmentStatus.PENDING,
              expiresAt,
            },
          ),
        );

      await queryRunner.manager.save(
        Appointment,
        appointments,
      );

      await queryRunner.commitTransaction();

      /*
       * Volvemos a consultar la orden para devolver
       * todas sus relaciones.
       */
      const createdOrder =
        await this.dataSource
          .getRepository(Order)
          .findOne({
            where: {
              order_id: savedOrder.order_id,
            },
            relations: [
              'user',
              'orderDetails',
              'orderDetails.appointments',
              'orderDetails.appointments.professional',
              'orderDetails.appointments.professional.user',
              'orderDetails.appointments.service',
              'payment',
            ],
          });

      if (!createdOrder) {
        throw new NotFoundException(
          'La orden fue creada pero no pudo recuperarse',
        );
      }

      return createdOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /*
   * Valida superposiciones entre los turnos que forman
   * parte de la nueva orden y todavía no existen en BD.
   */
  private validateInternalOverlaps(
    appointments: PreparedOrderAppointment[],
  ): void {
    for (let i = 0; i < appointments.length; i++) {
      for (
        let j = i + 1;
        j < appointments.length;
        j++
      ) {
        const first = appointments[i];
        const second = appointments[j];

        const overlaps =
          first.startAt < second.endAt &&
          first.endAt > second.startAt;

        if (!overlaps) {
          continue;
        }

        /*
         * El mismo cliente no puede tener dos turnos
         * superpuestos, aunque sean con profesionales
         * diferentes.
         */
        throw new ConflictException(
          'La orden contiene turnos con horarios superpuestos',
        );
      }
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.dataSource
      .getRepository(Order)
      .findOne({
        where: {
          order_id: id,
        },
        relations: [
          'user',
          'orderDetails',
          'orderDetails.appointments',
          'orderDetails.appointments.professional',
          'orderDetails.appointments.professional.user',
          'orderDetails.appointments.service',
          'payment',
        ],
      });

    if (!order) {
      throw new NotFoundException(
        'No existe una orden con el ID proporcionado',
      );
    }

    return order;
  }
}