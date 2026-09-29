import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { APP_TIMEZONE } from '../common/timezone';
import { ConfirmedAppointmentNotification } from './types/notification-type';

@Injectable()
export class NotificationsService {
  constructor(private readonly mailService: MailService) {}

  // Formatea la fecha utilizando el formato argentino
  // y la zona horaria configurada para Turnify.
  //comentado por Lautaro-dev
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  // Formatea la hora en formato de 24 horas utilizando
  // la zona horaria configurada para Turnify.
  //comentado por Lautaro-dev
  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  // Construye y envía el correo de confirmación de una orden,
  // incluyendo todos los turnos asociados y los datos del pago.
  //comentado por Lautaro-dev
  async sendOrderConfirmed(
    email: string,
    userName: string,
    appointments: ConfirmedAppointmentNotification[],
    depositAmount: number,
    totalAmount: number,
  ): Promise<void> {
    // Generamos el contenido HTML de todos los turnos de la orden
    // y lo unificamos en un único string para incluirlo en el correo.
    //comentado por Lautaro-dev
    const appointmentsHtml = appointments
      .map(
        (appointment) => `
        <div>
          <p><strong>Servicio:</strong> ${appointment.serviceName}</p>
          <p><strong>Profesional:</strong> ${appointment.professionalName}</p>
          <p><strong>Fecha:</strong> ${this.formatDate(appointment.startAt)}</p>
          <p><strong>Hora:</strong> ${this.formatTime(appointment.startAt)}</p>
          <p><strong>Duración:</strong> ${appointment.durationMinutes} minutos</p>
        </div>
      `,
      )
      .join('');

    await this.mailService.sendMail(
      email,
      'Turnos confirmados - Turnify',
      `
      <h1>Turnos confirmados</h1>

      <p>Hola ${userName},</p>

      <p>Tu pago fue recibido correctamente y tus turnos quedaron confirmados.</p>

      ${appointmentsHtml}

      <p><strong>Seña abonada:</strong> $${depositAmount}</p>
      <p><strong>Total de la orden:</strong> $${totalAmount}</p>
    `,
    );
  }
}
