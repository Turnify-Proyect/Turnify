// src/common/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendMailWithTemplate(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, string>,
  ): Promise<void> {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      '"Sistema" <no-reply@tuapp.com>',
    );

    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        `${templateName}.html`,
      );

      let htmlContent = await fs.readFile(templatePath, 'utf-8');

      for (const key of Object.keys(context)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(regex, context[key]);
      }

      await this.transporter.sendMail({
        from,
        to,
        subject,
        html: htmlContent,
      });
    } catch (error) {
      this.logger.error(
        `Error procesando/enviando plantilla para ${to}:`,
        error.message,
      );
      throw error;
    }
  }
}
