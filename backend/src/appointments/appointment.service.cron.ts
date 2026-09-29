// src/appointments/appointment.service.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { APP_TIMEZONE } from '../common/timezone';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentCronService {
  private readonly logger = new Logger(AppointmentCronService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,

    // Utiliza el servicio centralizado encargado de las notificaciones.
    //comentado por Lautaro-dev
    private readonly notificationsService: NotificationsService,
  ) {}

  // Ejecuta el recordatorio todos los días a las 08:00
  // utilizando la zona horaria configurada para la aplicación.
  //comentado por Lautaro-dev
  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    timeZone: APP_TIMEZONE,
  })
  async sendDailyAppointmentReminders() {
    this.logger.log(
      'Iniciando proceso automático de recordatorio de turnos...',
    );

    // Obtiene la fecha de mañana tomando como referencia
    // la zona horaria configurada para la aplicación.
    //comentado por Lautaro-dev
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tomorrowDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(tomorrow);

    try {
      const appointments = await this.appointmentRepository.find({
        where: {
          // Busca los turnos cuya fecha corresponde al día de mañana
          // según la zona horaria configurada para la aplicación.
          //comentado por Lautaro-dev
          startAt: Raw(
            (alias) => `DATE(${alias} AT TIME ZONE :timeZone) = :tomorrowDate`,
            {
              timeZone: APP_TIMEZONE,
              tomorrowDate,
            },
          ),
          status: AppointmentStatus.CONFIRMED,
        },
        relations: ['user', 'professional', 'professional.user', 'service'],
      });

      if (appointments.length === 0) {
        this.logger.log(
          'No se encontraron turnos confirmados para el día de mañana.',
        );
        return;
      }

      this.logger.log(
        `Encontrados ${appointments.length} turnos. Procesando envíos...`,
      );

      for (const appointment of appointments) {
        const { user, professional, service, startAt } = appointment;

        if (!user || !user.email) {
          this.logger.warn(
            `El turno ${appointment.id} no cuenta con un correo electrónico asignado.`,
          );
          continue;
        }

        try {
          // Delega la construcción y el envío del correo
          // al servicio centralizado de notificaciones.
          //comentado por Lautaro-dev
          await this.notificationsService.sendAppointmentReminder(
            user.email,
            user.name || 'Cliente',
            service?.name || 'No especificado',
            professional?.user?.name || 'No especificado',
            startAt,
          );
        } catch (mailError) {
          this.logger.error(
            `Error enviando correo para la cita ID ${appointment.id}: ${
              mailError instanceof Error ? mailError.message : String(mailError)
            }`,
          );
        }
      }

      this.logger.log('Proceso de recordatorio de turnos completado.');
    } catch (error) {
      this.logger.error(
        'Error general en el Cron de recordatorios:',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
