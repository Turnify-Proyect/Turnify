import {BadRequestException, ConflictException, Injectable, NotFoundException,} from '@nestjs/common';
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
    await this.appointmentsRepository
      .createQueryBuilder()
      .update(Appointment)
      .set({
        status: AppointmentStatus.EXPIRED,
      })
      .where('status = :pending', {
        pending: AppointmentStatus.PENDING,
      })
      .andWhere('expires_at IS NOT NULL')
      .andWhere('expires_at <= :now', {
        now: new Date(),
      })
      .execute();
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
  private async validateProfessionalNoOverlap(professionalId: string, startAt: Date, endAt: Date, appointmentIdToIgnore?: string,
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
    if (user.role !== UserRole.CLIENT) {
      throw new ConflictException(
        'Solo los usuarios con rol de cliente pueden realizar reservas',
      );
    }
  }

  //valida si el usuario tiene un turno asignado en el mismo horario
  private async validateUserNoOverlap(userId: string, startAt: Date, endAt: Date, appointmentIdToIgnore?: string): Promise<void> {
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

  //crear reserva de turno
  async createAppointment(
    createAppointmentDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    await this.expirePendingAppointments();
    const user = await this.usersRepository.findOne({
      where: {
        id: createAppointmentDto.userId,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No existe un usuario con el ID proporcionado',
      );
    }
    this.validateUserRole(user);

    const professional = await this.professionalsRepository.findOne({
      where: {
        id: createAppointmentDto.professionalId,
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

    const service = await this.servicesRepository.findOne({
      where: {
        id: createAppointmentDto.serviceId,
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

    const startAt = new Date(createAppointmentDto.startAt);

    if (Number.isNaN(startAt.getTime())) {
      throw new ConflictException('La fecha y hora del turno no son válidas');
    }

    const now = new Date();

    if (startAt <= now) {
      throw new ConflictException(
        'No se puede reservar un turno en una fecha u horario pasado',
      );
    }

    const endAt = new Date(
      startAt.getTime() + service.durationMinutes * 60 * 1000,
    );

    await this.validateProfessionalAvailability(
      professional.id,
      startAt,
      endAt,
    );

    await this.validateProfessionalNoOverlap(professional.id, startAt, endAt);

    await this.validateUserNoOverlap(user.id, startAt, endAt);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const appointment = this.appointmentsRepository.create({
      user,
      professional,
      service,
      startAt,
      endAt,
      status: AppointmentStatus.PENDING,
      expiresAt,
    });
    return this.appointmentsRepository.save(appointment);
  }

  //todos los turnos (ADMIN)
  async getAllAppointments(): Promise<Appointment[]> {
    await this.expirePendingAppointments();

    return this.appointmentsRepository.find({
      relations: {
        user: true,
        professional: {
          user: true,
        },
        service: true,
        payment: true,
      },
      order: {
        startAt: 'ASC',
      },
    });
  }

  //turno por ID
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
        payment: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('No existe un turno con el ID proporcionado');
    }

    return appointment;
  }

  //turnos por ID de usuario
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
        payment: true,
      },
      order: {
        startAt: 'ASC',
      },
    });
  }

  //turnos por ID de profesional
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
        payment: true,
      },
      order: {
        startAt: 'ASC',
      },
    });
  }

  //cancelación de turno
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
        payment: true,
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

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.expiresAt = null;

    this.appointmentsRepository.save(appointment);

    return "El turno ha sido cancelado exitosamente";
  }

  //reprogramación de turno
  async rescheduleAppointment(id: string, rescheduleAppointmentDto: RescheduleAppointmentDto,): Promise<Appointment> {
    await this.expirePendingAppointments();

    if (Object.keys(rescheduleAppointmentDto).length === 0) {
      throw new BadRequestException(
        'Debe indicar al menos un dato para reprogramar el turno',
      );
    }

    const appointment = await this.appointmentsRepository.findOne({
      where: {
        id,
        status: In([
          AppointmentStatus.PENDING,
          AppointmentStatus.CONFIRMED,
        ]),
      },
      relations: {
        user: true,
        professional: true,
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        'El turno no existe o no se encuentra en un estado válido para reprogramar',
      );
    }

    if (appointment.rescheduleCount >= 2) {
    throw new ConflictException({
      message:
        'El turno alcanzó el máximo de reprogramaciones permitidas',
      canCancel: true,
    });
    }

  const now = new Date();

  const hoursUntilAppointment =
    (appointment.startAt.getTime() - now.getTime()) /
    (1000 * 60 * 60);

  if (hoursUntilAppointment < 24) {
    throw new ConflictException(
      'No se puede reprogramar un turno con menos de 24 horas de anticipación',
    );
  }

  const professionalId = rescheduleAppointmentDto.professionalId ??
    appointment.professional.id;

  const serviceId = rescheduleAppointmentDto.serviceId ??
    appointment.service.id;

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

  const newStartAt = new Date(
    rescheduleAppointmentDto.startAt,
  );

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
    newStartAt.getTime() +
      service.durationMinutes * 60 * 1000,
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

  appointment.professional = professional;
  appointment.service = service;
  appointment.startAt = newStartAt;
  appointment.endAt = newEndAt;
  appointment.rescheduleCount += 1;

  // si el turno estaba pendiente, se reinicia el tiempo de expiración

  if (appointment.status === AppointmentStatus.PENDING) {
  appointment.expiresAt = new Date(
    Date.now() + 10 * 60 * 1000,
  );
  }  
  return this.appointmentsRepository.save(appointment);
  } 

  //marcar turno como 'completado' (DESDE EL PANEL DEL PROFESIONAL)
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
        payment: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        'No existe un turno con el ID proporcionado',
      );
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
    private validateAdminStatusTransition(currentStatus: AppointmentStatus, newStatus: AppointmentStatus,): void {
      const allowedTransitions: Record< AppointmentStatus, AppointmentStatus[]> = {
        [AppointmentStatus.PENDING]: [
          AppointmentStatus.CONFIRMED,
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

  async updateAppointmentStatus(id: string, newStatus: AppointmentStatus,): Promise<Appointment> {
    await this.expirePendingAppointments();

    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: {
        user: true,
        professional: {
          user: true,
        },
        service: true,
        payment: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        'No existe un turno con el ID proporcionado',
      );
    }

    this.validateAdminStatusTransition(
      appointment.status,
      newStatus,
    );

    appointment.status = newStatus;

    if (newStatus !== AppointmentStatus.PENDING) {
      appointment.expiresAt = null;
    }

    return this.appointmentsRepository.save(appointment);
  } 
   
}
