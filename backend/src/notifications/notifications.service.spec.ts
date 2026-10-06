import { Test, TestingModule } from '@nestjs/testing';

import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mailService = {
    sendMailWithTemplate: jest.fn(),
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('sendAppointmentReminder', () => {
    it('should send an appointment reminder email', async () => {
      const startAt = new Date('2026-10-15T15:30:00.000Z');

      mailService.sendMailWithTemplate.mockResolvedValue(undefined);

      await service.sendAppointmentReminder(
        'cliente@test.com',
        'Juan',
        'Corte de cabello',
        'Carlos',
        startAt,
      );

      expect(mailService.sendMailWithTemplate).toHaveBeenCalledTimes(1);

      expect(mailService.sendMailWithTemplate).toHaveBeenCalledWith(
        'cliente@test.com',
        'Recordatorio de tu turno - Turnify',
        'appointment.reminder',
        {
          userName: 'Juan',
          serviceName: 'Corte de cabello',
          professionalName: 'Carlos',
          time: expect.any(String),
        },
      );
    });

    it('should format the appointment time correctly', async () => {
      const startAt = new Date('2026-10-15T15:30:00.000Z');

      mailService.sendMailWithTemplate.mockResolvedValue(undefined);

      await service.sendAppointmentReminder(
        'cliente@test.com',
        'Juan',
        'Corte de cabello',
        'Carlos',
        startAt,
      );

      const call = mailService.sendMailWithTemplate.mock.calls[0];

      expect(call[3]).toEqual({
        userName: 'Juan',
        serviceName: 'Corte de cabello',
        professionalName: 'Carlos',
        time: expect.any(String),
      });

      expect(call[3].time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should propagate an error when sending the reminder email fails', async () => {
      const error = new Error('Mail service error');

      mailService.sendMailWithTemplate.mockRejectedValue(error);

      await expect(
        service.sendAppointmentReminder(
          'cliente@test.com',
          'Juan',
          'Corte de cabello',
          'Carlos',
          new Date('2026-10-15T15:30:00.000Z'),
        ),
      ).rejects.toThrow('Mail service error');
    });
  });

  describe('sendOrderConfirmed', () => {
    it('should send an order confirmation email', async () => {
      const appointments = [
        {
          serviceName: 'Corte de cabello',
          professionalName: 'Carlos',
          startAt: new Date('2026-10-15T15:30:00.000Z'),
          durationMinutes: 45,
        },
      ];

      mailService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderConfirmed(
        'cliente@test.com',
        'Juan',
        appointments,
        5000,
        10000,
      );

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        'cliente@test.com',
        'Turnos confirmados - Turnify',
        expect.stringContaining('<h1>Turnos confirmados</h1>'),
      );
    });

    it('should include user name in the confirmation email', async () => {
      const appointments = [
        {
          serviceName: 'Corte de cabello',
          professionalName: 'Carlos',
          startAt: new Date('2026-10-15T15:30:00.000Z'),
          durationMinutes: 45,
        },
      ];

      mailService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderConfirmed(
        'cliente@test.com',
        'Juan',
        appointments,
        5000,
        10000,
      );

      const html = mailService.sendMail.mock.calls[0][2];

      expect(html).toContain('Hola Juan');
    });

    it('should include appointment information in the confirmation email', async () => {
      const appointments = [
        {
          serviceName: 'Corte de cabello',
          professionalName: 'Carlos',
          startAt: new Date('2026-10-15T15:30:00.000Z'),
          durationMinutes: 45,
        },
        {
          serviceName: 'Barba',
          professionalName: 'Pedro',
          startAt: new Date('2026-10-16T18:00:00.000Z'),
          durationMinutes: 30,
        },
      ];

      mailService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderConfirmed(
        'cliente@test.com',
        'Juan',
        appointments,
        5000,
        10000,
      );

      const html = mailService.sendMail.mock.calls[0][2];

      expect(html).toContain('Corte de cabello');
      expect(html).toContain('Carlos');
      expect(html).toContain('45 minutos');

      expect(html).toContain('Barba');
      expect(html).toContain('Pedro');
      expect(html).toContain('30 minutos');
    });

    it('should include deposit and total amounts', async () => {
      const appointments = [
        {
          serviceName: 'Corte de cabello',
          professionalName: 'Carlos',
          startAt: new Date('2026-10-15T15:30:00.000Z'),
          durationMinutes: 45,
        },
      ];

      mailService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderConfirmed(
        'cliente@test.com',
        'Juan',
        appointments,
        5000,
        10000,
      );

      const html = mailService.sendMail.mock.calls[0][2];

      expect(html).toContain('Seña abonada:</strong> $5000');
      expect(html).toContain('Total de la orden:</strong> $10000');
    });

    it('should send an email even when there are no appointments', async () => {
      mailService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderConfirmed('cliente@test.com', 'Juan', [], 0, 0);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        'cliente@test.com',
        'Turnos confirmados - Turnify',
        expect.stringContaining('Turnos confirmados'),
      );
    });

    it('should propagate an error when sending the confirmation email fails', async () => {
      const error = new Error('Mail service error');

      mailService.sendMail.mockRejectedValue(error);

      await expect(
        service.sendOrderConfirmed('cliente@test.com', 'Juan', [], 5000, 10000),
      ).rejects.toThrow('Mail service error');
    });
  });
});
