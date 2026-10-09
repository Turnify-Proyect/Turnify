import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentCronService {
  private readonly logger = new Logger(AppointmentCronService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Revisa cada minuto si hay turnos confirmados dentro de las próximas 24 horas.
  @Cron(CronExpression.EVERY_MINUTE)
  async sendDailyAppointmentReminders(): Promise<void> {
    const now = new Date();
    const reminderDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    this.logger.log('Buscando turnos próximos que necesitan recordatorio...');

    try {
      const appointments = await this.appointmentRepository.find({
        where: {
          startAt: And(MoreThan(now), LessThanOrEqual(reminderDeadline)),
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
        },
        relations: ['user', 'professional', 'professional.user', 'service'],
        order: { startAt: 'ASC' },
      });

      if (appointments.length === 0) {
        this.logger.log(
          'No hay turnos pendientes de recordatorio en las próximas 24 horas.',
        );
        return;
      }

      for (const appointment of appointments) {
        const { user, professional, service, startAt } = appointment;

        if (!user?.email) {
          this.logger.warn(
            `El turno ${appointment.id} no cuenta con un correo electrónico asignado.`,
          );
          continue;
        }

        try {
          await this.notificationsService.sendAppointmentReminder(
            user.email,
            user.name || 'Cliente',
            service?.name || 'No especificado',
            professional?.user?.name || 'No especificado',
            startAt,
          );

          // Se marca solo después del envío exitoso, así un error de correo
          // permite que el siguiente ciclo vuelva a intentar el recordatorio.
          appointment.reminderSent = true;
          await this.appointmentRepository.save(appointment);
        } catch (error) {
          this.logger.error(
            `No se pudo procesar el recordatorio del turno ${appointment.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      this.logger.log(
        `Proceso de recordatorios completado. Turnos procesados: ${appointments.length}.`,
      );
    } catch (error) {
      this.logger.error(
        'Error general en el cron de recordatorios:',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
