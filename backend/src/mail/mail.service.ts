import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const port = Number(this.configService.get<string>('SMTP_PORT'));

    // Crea y configura el cliente SMTP que utilizará
    // la aplicación para enviar todos los correos.
    // comentado por: Lautaro-dev
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),

      port,

      // En SMTP normalmente:
      // puerto 465 -> conexión TLS directa (secure: true)
      // puerto 587 -> STARTTLS (secure: false)
      // comentado por: Lautaro-dev
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',

      // Credenciales utilizadas por Turnify para autenticarse
      // contra el servidor SMTP.
      // comentado por: Lautaro-dev
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  // Método genérico encargado de enviar un correo.
  // Recibe destinatario, asunto y contenido HTML para poder
  // reutilizarse luego desde distintos tipos de notificaciones.
  // comentado por: Lautaro-dev
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      // Remitente configurado para todos los correos de Turnify.
      // comentado por: Lautaro-dev
      from: this.configService.get<string>('MAIL_FROM'),

      // Dirección del destinatario.
      // comentado por: Lautaro-dev
      to,

      // Asunto que verá el usuario en su bandeja de entrada.
      // comentado por: Lautaro-dev
      subject,

      // Contenido del correo en formato HTML.
      // comentado por: Lautaro-dev
      html,
    });
  }

  // Construye y envía el correo de verificación de cuenta.
  // Recibe el email del usuario y el token original generado
  // por EmailVerificationService.
  // comentado por: Lautaro-dev
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // El enlace apunta al frontend, no directamente al backend.
    // El frontend recibe el token desde la URL y luego llama
    // al endpoint POST /auth/verify-email.
    // comentado por: Lautaro-dev
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.sendMail(
      email,
      'Verificá tu cuenta de Turnify',
      `
      <h1>Verificá tu correo</h1>
      <p>Para completar tu registro en Turnify, hacé clic en el siguiente enlace:</p>

      <a href="${verificationUrl}">
        Verificar mi correo
      </a>

      <p>Este enlace expirará en 30 minutos.</p>
    `,
    );
  }
}
