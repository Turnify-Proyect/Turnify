import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs/promises';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('MailService', () => {
  let service: MailService;

  const sendMailMock = jest.fn();

  const configValues: Record<string, string> = {
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'password123',
    MAIL_FROM: 'Turnify <test@test.com>',
    FRONTEND_URL: 'http://localhost:3000',
  };

  const configServiceMock = {
    get: jest.fn((key: string) => configValues[key]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  describe('constructor', () => {
    it('debería estar definido', () => {
      expect(service).toBeDefined();
    });

    it('debería crear el transporter con la configuración SMTP', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password123',
        },
      });
    });
  });

  describe('sendMail', () => {
    it('debería enviar un correo correctamente', async () => {
      sendMailMock.mockResolvedValue(undefined);

      await service.sendMail(
        'cliente@test.com',
        'Turno confirmado',
        '<h1>Tu turno fue confirmado</h1>',
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Turnify <test@test.com>',
        to: 'cliente@test.com',
        subject: 'Turno confirmado',
        html: '<h1>Tu turno fue confirmado</h1>',
      });
    });

    it('debería propagar el error del transporter', async () => {
      const error = new Error('Error enviando email');

      sendMailMock.mockRejectedValue(error);

      await expect(
        service.sendMail(
          'cliente@test.com',
          'Turno confirmado',
          '<h1>Contenido</h1>',
        ),
      ).rejects.toThrow('Error enviando email');

      expect(sendMailMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendMailWithTemplate', () => {
    it('debería leer la plantilla, reemplazar variables y enviar el correo', async () => {
      const template = `
        <h1>Hola {{name}}</h1>
        <p>Tu turno es el {{date}} a las {{time}}</p>
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(template);
      sendMailMock.mockResolvedValue(undefined);

      await service.sendMailWithTemplate(
        'cliente@test.com',
        'Recordatorio de turno',
        'appointment-reminder',
        {
          name: 'Juan',
          date: '10/10/2030',
          time: '15:00',
        },
      );

      expect(fs.readFile).toHaveBeenCalledTimes(1);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(
          'mailer-cron/templates/appointment-reminder.html',
        ),
        'utf-8',
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Turnify <test@test.com>',
        to: 'cliente@test.com',
        subject: 'Recordatorio de turno',
        html: `
        <h1>Hola Juan</h1>
        <p>Tu turno es el 10/10/2030 a las 15:00</p>
      `,
      });
    });

    it('debería reemplazar todas las apariciones de una variable', async () => {
      const template = `
        <p>{{name}}</p>
        <p>Hola {{name}}</p>
        <strong>{{name}}</strong>
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(template);
      sendMailMock.mockResolvedValue(undefined);

      await service.sendMailWithTemplate(
        'cliente@test.com',
        'Test',
        'test-template',
        {
          name: 'Carlos',
        },
      );

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Turnify <test@test.com>',
        to: 'cliente@test.com',
        subject: 'Test',
        html: `
        <p>Carlos</p>
        <p>Hola Carlos</p>
        <strong>Carlos</strong>
      `,
      });
    });

    it('debería propagar el error al leer la plantilla', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('No se pudo leer la plantilla'),
      );

      await expect(
        service.sendMailWithTemplate(
          'cliente@test.com',
          'Test',
          'template-inexistente',
          {},
        ),
      ).rejects.toThrow('No se pudo leer la plantilla');

      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('debería propagar el error al enviar la plantilla', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('<h1>Hola {{name}}</h1>');

      sendMailMock.mockRejectedValue(new Error('Error enviando plantilla'));

      await expect(
        service.sendMailWithTemplate('cliente@test.com', 'Test', 'template', {
          name: 'Juan',
        }),
      ).rejects.toThrow('Error enviando plantilla');
    });
  });

  describe('sendVerificationEmail', () => {
    it('debería enviar correctamente el correo de verificación', async () => {
      sendMailMock.mockResolvedValue(undefined);

      const sendMailSpy = jest
        .spyOn(service, 'sendMail')
        .mockResolvedValue(undefined);

      await service.sendVerificationEmail('cliente@test.com', 'abc123');

      expect(configServiceMock.get).toHaveBeenCalledWith('FRONTEND_URL');

      expect(sendMailSpy).toHaveBeenCalledTimes(1);

      expect(sendMailSpy).toHaveBeenCalledWith(
        'cliente@test.com',
        'Verificá tu cuenta de Turnify',
        expect.stringContaining(
          'http://localhost:3000/verify-email?token=abc123',
        ),
      );
    });

    it('debería incluir el token en el enlace de verificación', async () => {
      const sendMailSpy = jest
        .spyOn(service, 'sendMail')
        .mockResolvedValue(undefined);

      await service.sendVerificationEmail(
        'usuario@test.com',
        'token-super-secreto',
      );

      const html = sendMailSpy.mock.calls[0][2];

      expect(html).toContain(
        'http://localhost:3000/verify-email?token=token-super-secreto',
      );
    });

    it('debería propagar el error al enviar el correo de verificación', async () => {
      jest
        .spyOn(service, 'sendMail')
        .mockRejectedValue(new Error('Error enviando verificación'));

      await expect(
        service.sendVerificationEmail('cliente@test.com', 'abc123'),
      ).rejects.toThrow('Error enviando verificación');
    });
  });
});
