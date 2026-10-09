import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const port = Number(this.configService.get<string>('SMTP_PORT'));

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),

      port,

      secure: this.configService.get<string>('SMTP_SECURE') === 'true',

      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),

      to,

      subject,

      html,
    });
  }

  async sendMailWithTemplate(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, string>,
  ): Promise<void> {
    const templatePath = path.join(
      __dirname,
      'mailer-cron',
      'templates',
      `${templateName}.html`,
    );

    let htmlContent = await fs.readFile(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, value);
    }

    await this.sendMail(to, subject, htmlContent);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

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

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.sendMailWithTemplate(
      email,
      'Recuperá tu contraseña - Turnify',
      'password.reset',
      { resetUrl },
    );
  }
}
