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

  async sendAppointmentReminder(
    email: string,
    userName: string,
    serviceName: string,
    professionalName: string,
    startAt: Date,
  ): Promise<void> {
    // Envía el recordatorio utilizando la plantilla HTML del turno.
    //comentado por Lautaro-dev
    await this.mailService.sendMailWithTemplate(
      email,
      'Recordatorio de tu turno - Turnify',
      'appointment.reminder',
      {
        userName,
        serviceName,
        professionalName,
        time: this.formatTime(startAt),
      },
    );
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

  async sendPaymentLink(
  email: string,
  userName: string,
  appointments: ConfirmedAppointmentNotification[],
  depositAmount: number,
  checkoutUrl: string,
  expiresAt: Date,
): Promise<void> {
  const appointmentsHtml = appointments
    .map(
      (appointment) => `
        <div style="margin-bottom: 16px;">
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
    'Completá el pago de tu reserva - Turnify',
    `
      <h1>Reserva pendiente de confirmación</h1>

      <p>Hola ${userName},</p>

      <p>
        Desde el centro generaron una reserva a tu nombre.
        Para confirmarla, completá el pago de la seña.
      </p>

      ${appointmentsHtml}

      <p>
        <strong>Seña a abonar:</strong>
        $${depositAmount.toLocaleString('es-AR')}
      </p>

      <p>
        <strong>El enlace estará disponible hasta:</strong>
        ${this.formatDate(expiresAt)}
        ${this.formatTime(expiresAt)} hs
      </p>

      <p style="margin: 24px 0;">
        <a
          href="${checkoutUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #2f6f5e;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
          "
        >
          Pagar seña
        </a>
      </p>

      <p>
        La reserva quedará confirmada una vez recibido el pago.
      </p>

      <p>
        Si el enlace vence antes de que completes el pago,
        el horario volverá a quedar disponible.
      </p>
    `,
  );
}
}
