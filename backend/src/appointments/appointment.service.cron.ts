// src/appointments/appointment.service.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { MailerService } from '../mail/mailer-cron/mailer.service';

@Injectable()
export class AppointmentCronService {
  private readonly logger = new Logger(AppointmentCronService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly mailerService: MailerService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailyAppointmentReminders() {
    this.logger.log(
      'Iniciando proceso automático de recordatorio de turnos...',
    );

    const startOfTomorrow = new Date();
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date();
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    try {
      const appointments = await this.appointmentRepository.find({
        where: {
          startAt: Between(startOfTomorrow, endOfTomorrow),
          status: AppointmentStatus.CONFIRMED,
        },
        relations: ['user', 'professional', 'service'],
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

        const appointmentTime = startAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        try {
          await this.mailerService.sendMailWithTemplate(
            user.email,
            '⏰ Recordatorio de tu Turno - Próximas 24 Horas',
            'appointment-reminder',
            {
              userName: (user as any).name || 'Cliente', // Ajustado con 'as any' por si cambia en tu entidad
              serviceName: service?.name || 'No especificado',
              professionalName:
                (professional as any)?.name || 'No especificado', // Cast temporal para evitar el TS2339
              time: appointmentTime,
            },
          );
        } catch (mailError) {
          this.logger.error(
            `Error enviando correo para la cita ID ${appointment.id}: ${mailError.message}`,
          );
        }
      } // Fin del for

      this.logger.log('Proceso de recordatorio de turnos completado.');
    } catch (error) {
      this.logger.error(
        'Error general en el Cron de recordatorios:',
        error.stack,
      );
    }
  } // Fin del método
} // Fin de la clase
