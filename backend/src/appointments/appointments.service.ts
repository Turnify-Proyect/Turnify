import { Injectable, Logger } from '@nestjs/common';
import { AppointmentsRepository } from './appointments.repository';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from './entities/appointment.entity';
import { APP_TIMEZONE } from '../common/timezone';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UserRole } from 'src/common/userRoles.enum';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,

    // Servicio encargado de enviar las notificaciones relacionadas con los turnos.
    //comentado por Lautaro-dev
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly logger = new Logger(AppointmentsService.name);

  async getAllAppointments() {
    return await this.appointmentsRepository.getAllAppointments();
  }

  async getAppointmentById(id: string) {
    return await this.appointmentsRepository.getAppointmentById(id);
  }

  async getAppointmentsByUserId(userId: string) {
    return await this.appointmentsRepository.getAppointmentsByUserId(userId);
  }

  async getAppointmentsByProfessionalId(professionalId: string) {
    return await this.appointmentsRepository.getAppointmentsByProfessionalId(
      professionalId,
    );
  }

  async cancelAppointment(id: string) {
    // Obtiene los datos completos del turno antes de cancelarlo
    // para poder utilizarlos en la notificación.
    //comentado por Lautaro-dev
    const appointment =
      await this.appointmentsRepository.getAppointmentById(id);

    // Realiza la cancelación y conserva la respuesta original del repository.
    //comentado por Lautaro-dev
    const result = await this.appointmentsRepository.cancelAppointment(id);

    try {
      // Envía la notificación únicamente después de que
      // la cancelación se guardó correctamente.
      //comentado por Lautaro-dev
      await this.notificationsService.sendAppointmentCancelled(
        appointment.user.email,
        appointment.user.name,
        appointment.service.name,
        appointment.professional?.user?.name || 'No especificado',
        appointment.startAt,
      );
    } catch (error) {
      // Un fallo en el correo no debe revertir ni invalidar
      // una cancelación que ya fue guardada correctamente.
      //comentado por Lautaro-dev
      this.logger.error(
        'El turno fue cancelado pero no se pudo enviar el correo de cancelación',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return result;
  }

  async rescheduleAppointment(
    id: string,
    rescheduleAppointmentDto: RescheduleAppointmentDto,
  ) {
    // Reprograma el turno utilizando todas las validaciones del repository.
    //comentado por Lautaro-dev
    const result = await this.appointmentsRepository.rescheduleAppointment(
      id,
      rescheduleAppointmentDto,
    );

    try {
      // Recupera nuevamente el turno con todas sus relaciones actualizadas
      // para obtener los datos necesarios para la notificación.
      //comentado por Lautaro-dev
      const updatedAppointment =
        await this.appointmentsRepository.getAppointmentById(id);

      // Envía al cliente los datos actualizados de la reprogramación.
      //comentado por Lautaro-dev
      await this.notificationsService.sendAppointmentRescheduled(
        updatedAppointment.user.email,
        updatedAppointment.user.name,
        updatedAppointment.service.name,
        updatedAppointment.professional?.user?.name || 'No especificado',
        updatedAppointment.startAt,
      );
    } catch (error) {
      // Un error en el correo no debe invalidar una reprogramación
      // que ya fue guardada correctamente.
      //comentado por Lautaro-dev
      this.logger.error(
        'El turno fue reprogramado pero no se pudo enviar el correo de reprogramación',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return result;
  }
  async completeAppointment(id: string, userId: string, roles: UserRole[]) {
    return await this.appointmentsRepository.completeAppointment(id, userId, roles);
  }

  async markAppointmentNoShow(id: string, userId: string, roles: UserRole[]) {
    return await this.appointmentsRepository.markAppointmentNoShow(id, userId, roles);
  }

  async updateAppointmentStatus(id: string, newStatus: AppointmentStatus) {
    const result = await this.appointmentsRepository.updateAppointmentStatus(
      id,
      newStatus,
    );

    if (newStatus === AppointmentStatus.CONFIRMED) {
      try {
        const appointment =
          await this.appointmentsRepository.getAppointmentById(id);

        await this.notificationsService.sendAppointmentConfirmedByAdmin(
          appointment.user.email,
          appointment.user.name,
          appointment.service.name,
          appointment.professional?.user?.name || 'No especificado',
          appointment.startAt,
        );
      } catch (error) {
        this.logger.error(
          'El turno fue confirmado pero no se pudo enviar el correo de confirmación',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return result;
  }

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string,
    appointmentId?: string,
  ) {
    return this.appointmentsRepository.getAvailableSlots(
      professionalId,
      serviceId,
      date,
      appointmentId,
    );
  }
}
