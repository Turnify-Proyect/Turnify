import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

import { UserRole } from '../common/userRoles.enum';
import { User } from '../users/entities/user.entity';
import { Professional } from '../professionals/entities/professional.entity';
import { Service } from '../services/entities/service.entity';
import { ProfessionalService } from '../professionals/entities/professional-service.entity';

import { AvailabilityRepository } from '../availability/availability.repository';
import { DayOfWeek } from '../availability/entities/availability.entity';

import { DataSource } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order-detail.entity';
import { LessThanOrEqual } from 'typeorm';
import { OrderStatus } from '../orders/enums/order-status.enum';

type PreparedAppointment = {
  user: User;
  professional: Professional;
  service: Service;
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class AppointmentsRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Professional)
    private readonly professionalsRepository: Repository<Professional>,

    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,

    @InjectRepository(ProfessionalService)
    private readonly professionalServicesRepository: Repository<ProfessionalService>,

    private readonly availabilityRepository: AvailabilityRepository,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly orderDetailsRepository: Repository<OrderDetail>,
    
    private readonly dataSource: DataSource,

  ) {}
  //funcion para obtener el dia de la semana a partir de una fecha
  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    return days[date.getDay()];
  }

  //función para expirar turnos pendientes que hayan pasado su fecha de expiración.
  // Esto se puede hacer con un cron/job programado para que cambie a EXPIRED exactamente
  // al cumplirse los 10 minutos aunque nadie haga una nueva request - REVISAR EN GRUPO
  private async expirePendingAppointments(): Promise<void> {
  const now = new Date();

  const expiredAppointments = await this.appointmentsRepository.find({
    where: {
      status: AppointmentStatus.PENDING,
      expiresAt: LessThanOrEqual(now),
    },
    relations: ['orderDetail', 'orderDetail.order'],
  });

  if (expiredAppointments.length === 0) {
    return;
  }

  const orderIds = [
    ...new Set(
      expiredAppointments
        .map(
          (appointment) =>
            appointment.orderDetail?.order?.order_id,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (orderIds.length === 0) {
    return;
  }

  await this.dataSource.transaction(async (manager) => {
    await manager
      .createQueryBuilder()
      .update(Appointment)
      .set({
        status: AppointmentStatus.EXPIRED,
      })
      .where('status = :pending', {
        pending: AppointmentStatus.PENDING,
      })
      .andWhere(
        `order_detail_id IN (
          SELECT order_detail_id
          FROM "ORDER_DETAILS"
          WHERE order_id IN (:...orderIds)
        )`,
        { orderIds },
      )
      .execute();

    await manager
      .createQueryBuilder()
      .update(Order)
      .set({
        status: OrderStatus.CANCELLED,
      })
      .where('order_id IN (:...orderIds)', { orderIds })
      .andWhere('status = :pending', {
        pending: OrderStatus.PENDING,
      })
      .execute();
  });
}

  //valida si el profesional esta disponible en el horario solicitado
  private async validateProfessionalAvailability(
    professionalId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    const dayOfWeek = this.getDayOfWeek(startAt);

    const availabilities =
      await this.availabilityRepository.getByProfessionalAndDay(
        professionalId,
        dayOfWeek,
      );

    const appointmentStartMinutes =
      startAt.getHours() * 60 + startAt.getMinutes();

    const appointmentEndMinutes = endAt.getHours() * 60 + endAt.getMinutes();

    const isWithinAvailability = availabilities.some((availability) => {
      const [startHour, startMinute] = availability.startTime
        .split(':')
        .map(Number);

      const [endHour, endMinute] = availability.endTime.split(':').map(Number);

      const availabilityStartMinutes = startHour * 60 + startMinute;

      const availabilityEndMinutes = endHour * 60 + endMinute;

      return (
        appointmentStartMinutes >= availabilityStartMinutes &&
        appointmentEndMinutes <= availabilityEndMinutes
      );
    });

    if (!isWithinAvailability) {
      throw new ConflictException(
        'El profesional no se encuentra disponible en el horario seleccionado',
      );
    }
  }
  //valida si el profesional tiene un turno asignado en el mismo horario
  private async validateProfessionalNoOverlap(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    appointmentIdToIgnore?: string,
  ): Promise<void> {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.professional_id = :professionalId', {
        professionalId,
      })
      .andWhere(
        `(
          appointment.status = :confirmed
          OR (
            appointment.status = :pending
            AND appointment.expires_at > :now
          )
        )`,
        {
          confirmed: AppointmentStatus.CONFIRMED,
          pending: AppointmentStatus.PENDING,
          now: new Date(),
        },
      )
      .andWhere('appointment.start_at < :endAt', { endAt })
      .andWhere('appointment.end_at > :startAt', { startAt });

    if (appointmentIdToIgnore) {
      query.andWhere('appointment.appointment_id != :appointmentIdToIgnore', {
        appointmentIdToIgnore,
      });
    }

    const overlappingAppointment = await query.getOne();

    if (overlappingAppointment) {
      throw new ConflictException(
        'El profesional ya tiene un turno asignado en ese horario',
      );
    }
  }

  //valida si el usuario tiene rol de cliente
  private validateUserRole(user: User): void {
    if (!user.roles.includes(UserRole.CLIENT)) {
      throw new ConflictException(
        'Solo los usuarios con rol de cliente pueden realizar reservas',
      );
    }
  }

  //valida si el usuario tiene un turno asignado en el mismo horario
  private async validateUserNoOverlap(
    userId: string,
    startAt: Date,
    endAt: Date,
    appointmentIdToIgnore?: string,
  ): Promise<void> {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.user_id = :userId', {
        userId,
      })
      .andWhere(
        `(
          appointment.status = :confirmed
          OR (
            appointment.status = :pending
            AND appointment.expires_at > :now
          )
        )`,
        {
          confirmed: AppointmentStatus.CONFIRMED,
          pending: AppointmentStatus.PENDING,
          now: new Date(),
        },
      )
      .andWhere('appointment.start_at < :endAt', { endAt })
      .andWhere('appointment.end_at > :startAt', { startAt });

    if (appointmentIdToIgnore) {
      query.andWhere('appointment.appointment_id != :appointmentIdToIgnore', {
        appointmentIdToIgnore,
      });
    }

    const overlappingAppointment = await query.getOne();

    if (overlappingAppointment) {
      throw new ConflictException(
        'El usuario ya tiene un turno asignado en ese horario',
      );
    }
  }

// ------------------------
  async prepareAppointment(
  userId: string,
  professionalId: string,
  serviceId: string,
  startAtValue: string,
  appointmentIdToIgnore?: string,
): Promise<PreparedAppointment> {
  await this.expirePendingAppointments();

  // Usuario
  const user = await this.usersRepository.findOne({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'No existe un usuario con el ID proporcionado',
    );
  }

  this.validateUserRole(user);

  // Profesional
  const professional =
    await this.professionalsRepository.findOne({
      where: {
        id: professionalId,
      },
    });

  if (!professional) {
    throw new NotFoundException(
      'No existe un profesional con el ID proporcionado',
    );
  }

  if (!professional.isActive) {
    throw new ConflictException(
      'El profesional seleccionado se encuentra inactivo',
    );
  }

  // Servicio
  const service = await this.servicesRepository.findOne({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    throw new NotFoundException(
      'No existe un servicio con el ID proporcionado',
    );
  }

  if (!service.isActive) {
    throw new ConflictException(
      'El servicio seleccionado se encuentra inactivo',
    );
  }

  // Validar que el profesional realice el servicio
  const professionalService =
    await this.professionalServicesRepository.findOne({
      where: {
        professionalId: professional.id,
        serviceId: service.id,
      },
    });

  if (!professionalService) {
    throw new ConflictException(
      'El profesional seleccionado no realiza este servicio',
    );
  }

  // Fecha
  const startAt = new Date(startAtValue);

  if (Number.isNaN(startAt.getTime())) {
    throw new ConflictException(
      'La fecha y hora del turno no son válidas',
    );
  }

  const now = new Date();

  if (startAt <= now) {
    throw new ConflictException(
      'No se puede reservar un turno en una fecha u horario pasado',
    );
  }

  // Hora de finalización calculada según duración del servicio
  const endAt = new Date(
    startAt.getTime() +
      service.durationMinutes * 60 * 1000,
  );

  // Disponibilidad del profesional
  await this.validateProfessionalAvailability(
    professional.id,
    startAt,
    endAt,
  );

  // Superposición contra turnos existentes del profesional
  await this.validateProfessionalNoOverlap(
    professional.id,
    startAt,
    endAt,
    appointmentIdToIgnore,
  );

  // Superposición contra turnos existentes del usuario
  await this.validateUserNoOverlap(
    user.id,
    startAt,
    endAt,
    appointmentIdToIgnore,
  );

  return {
    user,
    professional,
    service,
    startAt,
    endAt,
  };
}

// crear appointment nuevo:

async createAppointment(
  createAppointmentDto: CreateAppointmentDto,
): Promise<Appointment> {
  const prepared = await this.prepareAppointment(
    createAppointmentDto.userId,
    createAppointmentDto.professionalId,
    createAppointmentDto.serviceId,
    createAppointmentDto.startAt,
  );

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000,
  );

  // Flujo anterior temporal.
  // Se mantiene hasta migrar la creación al OrdersService.
  const order = this.ordersRepository.create({
    user: prepared.user,
  });

  const savedOrder =
    await this.ordersRepository.save(order);

  const orderDetail =
    this.orderDetailsRepository.create({
      order: savedOrder,
      total_price: Number(prepared.service.price),
    });

  const savedOrderDetail =
    await this.orderDetailsRepository.save(orderDetail);

  const appointment =
    this.appointmentsRepository.create({
      user: prepared.user,
      professional: prepared.professional,
      service: prepared.service,
      orderDetail: savedOrderDetail,
      startAt: prepared.startAt,
      endAt: prepared.endAt,
      status: AppointmentStatus.PENDING,
      expiresAt,
    });

  return this.appointmentsRepository.save(
    appointment,
  );
}

  //crear reserva de turno
//  async createAppointment(
//    createAppointmentDto: CreateAppointmentDto,
//  ): Promise<Appointment> {
//    await this.expirePendingAppointments();
//    const user = await this.usersRepository.findOne({
//      where: {
//        id: createAppointmentDto.userId,
//      },
//    });
//
//    if (!user) {
//      throw new NotFoundException(
//        'No existe un usuario con el ID proporcionado',
//      );
//    }
//    this.validateUserRole(user);
//
//    const professional = await this.professionalsRepository.findOne({
//      where: {
//        id: createAppointmentDto.professionalId,
//      },
//    });
//
//    if (!professional) {
//      throw new NotFoundException(
//        'No existe un profesional con el ID proporcionado',
//      );
//    }
//
//    if (!professional.isActive) {
//      throw new ConflictException(
//        'El profesional seleccionado se encuentra inactivo',
//      );
//    }
//
//    const service = await this.servicesRepository.findOne({
//      where: {
//        id: createAppointmentDto.serviceId,
//      },
//    });
//
//    if (!service) {
//      throw new NotFoundException(
//        'No existe un servicio con el ID proporcionado',
//      );
//    }
//
//    if (!service.isActive) {
//      throw new ConflictException(
//        'El servicio seleccionado se encuentra inactivo',
//      );
//    }
//
//    const professionalService =
//      await this.professionalServicesRepository.findOne({
//        where: {
//          professionalId: professional.id,
//          serviceId: service.id,
//        },
//      });
//
//    if (!professionalService) {
//      throw new ConflictException(
//        'El profesional seleccionado no realiza este servicio',
//      );
//    }
//
//    const startAt = new Date(createAppointmentDto.startAt);
//
//    if (Number.isNaN(startAt.getTime())) {
//      throw new ConflictException('La fecha y hora del turno no son válidas');
//    }
//
//    const now = new Date();
//
//    if (startAt <= now) {
//      throw new ConflictException(
//        'No se puede reservar un turno en una fecha u horario pasado',
//      );
//    }
//
//    const endAt = new Date(
//      startAt.getTime() + service.durationMinutes * 60 * 1000,
//    );
//
//    await this.validateProfessionalAvailability(
//      professional.id,
//      startAt,
//      endAt,
//    );
//
//    await this.validateProfessionalNoOverlap(professional.id, startAt, endAt);
//
//    await this.validateUserNoOverlap(user.id, startAt, endAt);
//
//    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
//
//    // Crear la orden
//    const order = this.ordersRepository.create({
//      user,
//    });
//
//    const savedOrder = await this.ordersRepository.save(order);
//
//    // Crear el detalle de la orden con el precio del servicio
//    const orderDetail = this.orderDetailsRepository.create({
//      order: savedOrder,
//      total_price: Number(service.price),
//    });
//
//    const savedOrderDetail =
//      await this.orderDetailsRepository.save(orderDetail);
//
//    // Crear el turno asociado al detalle de la orden
//    const appointment = this.appointmentsRepository.create({
//      user,
//      professional,
//      service,
//      orderDetail: savedOrderDetail,
//      startAt,
//      endAt,
//      status: AppointmentStatus.PENDING,
//      expiresAt,
//    });
//
//    return this.appointmentsRepository.save(appointment);
//  }
//
  // todos los turnos (ADMIN)
  async getAllAppointments(): Promise<Appointment[]> {
    await this.expirePendingAppointments();

    return this.appointmentsRepository.find({
      relations: {
        user: true,
        professional: {
          user: true,
        },
        service: true,

        // El pago ya no pertenece directamente al Appointment.
        // Ahora se accede mediante:
        // Appointment -> OrderDetail -> Order -> Payment
        //comentado por Lautaro-dev
        orderDetail: {
          order: {
            payment: true,
          },
        },
      },
      order: {
        startAt: 'ASC',
      },
    });
  }

  // turno por ID
  async getAppointmentById(id: string): Promise<Appointment> {
    await this.expirePendingAppointments();

    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: {
        user: true,
        professional: {
          user: true,
        },
        service: true,

        // El Payment ya no pertenece directamente al Appointment.
        // Ahora se obtiene mediante:
        // Appointment -> OrderDetail -> Order -> Payment
        //comentado por Lautaro-dev
        orderDetail: {
          order: {
            payment: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('No existe un turno con el ID proporcionado');
    }

    return appointment;
  }

  // turnos por ID de usuario
  async getAppointmentsByUserId(userId: string): Promise<Appointment[]> {
    await this.expirePendingAppointments();

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'No existe un usuario con el ID proporcionado',
      );
    }

    return this.appointmentsRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: {
        professional: {
          user: true,
        },
        service: true,

        // El Payment ahora pertenece a la Order.
        // Ruta: Appointment -> OrderDetail -> Order -> Payment
        //comentado por Lautaro-dev
        orderDetail: {
          order: {
            payment: true,
          },
        },
      },
      order: {
        startAt: 'ASC',
      },
    });
  }

  // turnos por ID de profesional
  async getAppointmentsByProfessionalId(
    professionalId: string,
  ): Promise<Appointment[]> {
    await this.expirePendingAppointments();

    const professional = await this.professionalsRepository.findOne({
      where: { id: professionalId },
    });

    if (!professional) {
      throw new NotFoundException(
        'No existe un profesional con el ID proporcionado',
      );
    }

    return this.appointmentsRepository.find({
      where: {
        professional: {
          id: professionalId,
        },
      },
      relations: {
        professional: {
          user: true,
        },
        service: true,

        // El Payment ya no pertenece directamente al Appointment.
        // Ahora se accede mediante:
        // Appointment -> OrderDetail -> Order -> Payment
        //comentado por Lautaro-dev
        orderDetail: {
          order: {
            payment: true,
          },
        },
      },
      order: {
        startAt: 'ASC',
      },
    });
  }

  // cancelación de turno
  async cancelAppointment(id: string): Promise<string> {
  await this.expirePendingAppointments();

  const appointment = await this.appointmentsRepository.findOne({
    where: { id },
    relations: {
      user: true,
      professional: {
        user: true,
      },
      service: true,
      orderDetail: {
        order: {
          payment: true,
        },
        appointments: {
          service: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new NotFoundException(
      'No existe un turno con el ID proporcionado',
    );
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new ConflictException(
      'El turno ya se encuentra cancelado',
    );
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw new ConflictException(
      'No se puede cancelar un turno completado',
    );
  }

  if (appointment.status === AppointmentStatus.EXPIRED) {
    throw new ConflictException(
      'No se puede cancelar un turno expirado',
    );
  }

  const orderDetail = appointment.orderDetail;
  const order = orderDetail.order;

  await this.dataSource.transaction(async (manager) => {
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.expiresAt = null;

    await manager.save(Appointment, appointment);

    // Si todavía no se pagó la orden, recalculamos su total.
    if (order.status === OrderStatus.PENDING) {
      const remainingAppointments =
        orderDetail.appointments.filter(
          (currentAppointment) =>
            currentAppointment.id !== appointment.id &&
            currentAppointment.status === AppointmentStatus.PENDING,
        );

      if (remainingAppointments.length === 0) {
        order.status = OrderStatus.CANCELLED;

        await manager.save(Order, order);
      } else {
        const newTotal = remainingAppointments.reduce(
          (total, currentAppointment) =>
            total + Number(currentAppointment.service.price),
          0,
        );

        orderDetail.total_price = newTotal;

        await manager.save(OrderDetail, orderDetail);
      }
    }
  });

  return 'El turno ha sido cancelado exitosamente';
}

  //reprogramación de turno
  async rescheduleAppointment(
    id: string,
    rescheduleAppointmentDto: RescheduleAppointmentDto,
  ): Promise<Appointment> {
    await this.expirePendingAppointments();

    if (Object.keys(rescheduleAppointmentDto).length === 0) {
      throw new BadRequestException(
        'Debe indicar al menos un dato para reprogramar el turno',
      );
    }

    const appointment = await this.appointmentsRepository.findOne({
      where: {
        id,
        status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
      },
      relations: {user: true,
      professional: true,
      service: true,
      orderDetail: {
        order: {
          payment: true,
        },
        appointments: {
      service: true,
    },
  },
    }});

    if (!appointment) {
      throw new NotFoundException(
        'El turno no existe o no se encuentra en un estado válido para reprogramar',
      );
    }

    if (appointment.rescheduleCount >= 2) {
      throw new ConflictException({
        message: 'El turno alcanzó el máximo de reprogramaciones permitidas',
        canCancel: true,
      });
    }

    const now = new Date();

    const hoursUntilAppointment =
      (appointment.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      throw new ConflictException(
        'No se puede reprogramar un turno con menos de 24 horas de anticipación',
      );
    }

    const professionalId =
      rescheduleAppointmentDto.professionalId ?? appointment.professional.id;

    const serviceId =
      rescheduleAppointmentDto.serviceId ?? appointment.service.id;

    const professional = await this.professionalsRepository.findOne({
      where: { id: professionalId },
    });

    if (!professional) {
      throw new NotFoundException(
        'No existe un profesional con el ID proporcionado',
      );
    }

    if (!professional.isActive) {
      throw new ConflictException(
        'El profesional seleccionado se encuentra inactivo',
      );
    }

    const service = await this.servicesRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(
        'No existe un servicio con el ID proporcionado',
      );
    }

    if (!service.isActive) {
      throw new ConflictException(
        'El servicio seleccionado se encuentra inactivo',
      );
    }

    const professionalService =
      await this.professionalServicesRepository.findOne({
        where: {
          professionalId: professional.id,
          serviceId: service.id,
        },
      });

    if (!professionalService) {
      throw new ConflictException(
        'El profesional seleccionado no realiza este servicio',
      );
    }

    const newStartAt = new Date(rescheduleAppointmentDto.startAt);

    if (Number.isNaN(newStartAt.getTime())) {
      throw new ConflictException(
        'La nueva fecha y hora del turno no son válidas',
      );
    }

    if (newStartAt <= now) {
      throw new ConflictException(
        'No se puede reprogramar un turno a una fecha u horario pasado',
      );
    }

    const newEndAt = new Date(
      newStartAt.getTime() + service.durationMinutes * 60 * 1000,
    );

    await this.validateProfessionalAvailability(
      professional.id,
      newStartAt,
      newEndAt,
    );

    await this.validateProfessionalNoOverlap(
      professional.id,
      newStartAt,
      newEndAt,
      appointment.id,
    );

    await this.validateUserNoOverlap(
      appointment.user.id,
      newStartAt,
      newEndAt,
      appointment.id,
    );

  const serviceChanged = appointment.service.id !== service.id;

    appointment.professional = professional;
    appointment.service = service;
    appointment.startAt = newStartAt;
    appointment.endAt = newEndAt;
    appointment.rescheduleCount += 1;

    // si el turno estaba pendiente, se reinicia el tiempo de expiración

    if (appointment.status === AppointmentStatus.PENDING) {
      appointment.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }
    return this.dataSource.transaction(async (manager) => {
  const savedAppointment = await manager.save(
    Appointment,
    appointment,
  );

  // Si cambió el servicio, actualizamos el valor actual
  // de la orden.
  //
  // Esto NO modifica el Payment ya realizado.
  // La seña abonada se conserva y cualquier diferencia
  // se paga presencialmente.
  if (serviceChanged) {
    const orderDetail = appointment.orderDetail;

    const newTotal = orderDetail.appointments
      .filter(
        (currentAppointment) =>
          currentAppointment.status !==
            AppointmentStatus.CANCELLED &&
          currentAppointment.status !==
            AppointmentStatus.EXPIRED,
      )
      .reduce((total, currentAppointment) => {
        // Para el turno que estamos reprogramando usamos
        // el nuevo servicio.
        if (currentAppointment.id === appointment.id) {
          return total + Number(service.price);
        }

        return (
          total +
          Number(currentAppointment.service.price)
        );
      }, 0);

    orderDetail.total_price = newTotal;

    await manager.save(OrderDetail, orderDetail);
  }

  return savedAppointment;
});

  }

  // marcar turno como 'completado' (DESDE EL PANEL DEL PROFESIONAL)
  async completeAppointment(id: string): Promise<Appointment> {
    await this.expirePendingAppointments();

    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: {
        user: true,
        professional: {
          user: true,
        },
        service: true,

        // El Payment ya no pertenece directamente al Appointment.
        // Ahora se accede mediante:
        // Appointment -> OrderDetail -> Order -> Payment
        //comentado por Lautaro-dev
        orderDetail: {
          order: {
            payment: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('No existe un turno con el ID proporcionado');
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        'Solo se pueden completar turnos confirmados',
      );
    }

    const now = new Date();

    if (appointment.startAt > now) {
      throw new ConflictException(
        'No se puede completar un turno que todavía no comenzó',
      );
    }

    appointment.status = AppointmentStatus.COMPLETED;

    return this.appointmentsRepository.save(appointment);
  }

  //cambiar el estado de un turno (DESDE EL PANEL DEL ADMINISTRADOR)

  //función para validar si el cambio de estado es válido según las reglas de negocio
  // Función para validar si el cambio de estado es válido
// según las reglas de negocio.
private validateAdminStatusTransition(
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
): void {
  const allowedTransitions: Record<
    AppointmentStatus,
    AppointmentStatus[]
  > = {
    // Un turno pendiente NO puede confirmarse manualmente.
    // La confirmación ocurre cuando se acredita el pago de la seña.
    [AppointmentStatus.PENDING]: [
      AppointmentStatus.CANCELLED,
    ],

    [AppointmentStatus.CONFIRMED]: [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
    ],

    [AppointmentStatus.CANCELLED]: [],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.EXPIRED]: [],
  };

  const allowedStatuses = allowedTransitions[currentStatus];

  if (!allowedStatuses.includes(newStatus)) {
    throw new ConflictException(
      `No se puede cambiar el estado del turno de ${currentStatus} a ${newStatus}`,
    );
  }
}


// Cambiar el estado de un turno
// (DESDE EL PANEL DEL ADMINISTRADOR)
async updateAppointmentStatus(
  id: string,
  newStatus: AppointmentStatus,
): Promise<Appointment> {
  await this.expirePendingAppointments();

  const appointment = await this.appointmentsRepository.findOne({
    where: { id },
    relations: {
      user: true,
      professional: {
        user: true,
      },
      service: true,
      orderDetail: {
        order: {
          payment: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new NotFoundException(
      'No existe un turno con el ID proporcionado',
    );
  }

  // Validamos que la transición solicitada esté permitida.
  this.validateAdminStatusTransition(
    appointment.status,
    newStatus,
  );

  // Si el administrador cancela el turno, reutilizamos
  // cancelAppointment() para aplicar también toda la lógica
  // correspondiente a Order y OrderDetail.
  if (newStatus === AppointmentStatus.CANCELLED) {
    await this.cancelAppointment(id);

    const cancelledAppointment =
      await this.appointmentsRepository.findOne({
        where: { id },
        relations: {
          user: true,
          professional: {
            user: true,
          },
          service: true,
          orderDetail: {
            order: {
              payment: true,
            },
          },
        },
      });

    if (!cancelledAppointment) {
      throw new NotFoundException(
        'No se pudo recuperar el turno cancelado',
      );
    }

    return cancelledAppointment;
  }

  // Los demás cambios permitidos se realizan normalmente.
  appointment.status = newStatus;

  if (newStatus !== AppointmentStatus.PENDING) {
    appointment.expiresAt = null;
  }

  return this.appointmentsRepository.save(appointment);
}

  
}
