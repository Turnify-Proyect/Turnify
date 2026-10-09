jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: {
    EVERY_MINUTE: '* * * * *',
  },
}));

import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AppointmentCronService } from './appointment.service.cron';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('AppointmentCronService', () => {
  let service: AppointmentCronService;
  let appointmentRepository: jest.Mocked<Repository<Appointment>>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(() => {
    appointmentRepository = {
      find: jest.fn(),
      save: jest.fn().mockImplementation(async (appointment) => appointment),
    } as unknown as jest.Mocked<Repository<Appointment>>;

    notificationsService = {
      sendAppointmentReminder: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    service = new AppointmentCronService(
      appointmentRepository,
      notificationsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('sendDailyAppointmentReminders', () => {
    it('should send reminders for all confirmed appointments with valid emails', async () => {
      const startAt = new Date('2026-10-08T10:00:00.000Z');

      const appointments = [
        {
          id: 'appointment-1',
          startAt,
          user: {
            email: 'juan@example.com',
            name: 'Juan Pérez',
          },
          professional: {
            user: {
              name: 'Dr. García',
            },
          },
          service: {
            name: 'Consulta médica',
          },
          status: AppointmentStatus.CONFIRMED,
        },
        {
          id: 'appointment-2',
          startAt,
          user: {
            email: 'maria@example.com',
            name: 'María López',
          },
          professional: {
            user: {
              name: 'Dra. Rodríguez',
            },
          },
          service: {
            name: 'Control general',
          },
          status: AppointmentStatus.CONFIRMED,
        },
      ] as unknown as Appointment[];

      appointmentRepository.find.mockResolvedValue(appointments);

      notificationsService.sendAppointmentReminder.mockResolvedValue(undefined);

      await service.sendDailyAppointmentReminders();

      expect(appointmentRepository.find).toHaveBeenCalledTimes(1);

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(2);

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        1,
        'juan@example.com',
        'Juan Pérez',
        'Consulta médica',
        'Dr. García',
        startAt,
      );

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        2,
        'maria@example.com',
        'María López',
        'Control general',
        'Dra. Rodríguez',
        startAt,
      );

      expect(
        appointments.every((appointment) => appointment.reminderSent),
      ).toBe(true);
      expect(appointmentRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should query unreminded confirmed appointments in the next 24 hours', async () => {
      appointmentRepository.find.mockResolvedValue([]);

      await service.sendDailyAppointmentReminders();

      expect(appointmentRepository.find).toHaveBeenCalledTimes(1);

      const findOptions = appointmentRepository.find.mock.calls[0][0];

      expect(findOptions).toBeDefined();
      expect(findOptions?.where).toBeDefined();

      const startAtCondition = findOptions?.where?.startAt;

      expect(startAtCondition).toBeDefined();
      expect(startAtCondition.type).toBe('and');
      expect(startAtCondition.value).toHaveLength(2);
      expect(startAtCondition.value[0].type).toBe('moreThan');
      expect(startAtCondition.value[1].type).toBe('lessThanOrEqual');
      expect(startAtCondition.value[0].value).toBeInstanceOf(Date);
      expect(startAtCondition.value[1].value).toBeInstanceOf(Date);
      expect(
        startAtCondition.value[1].value.getTime() -
          startAtCondition.value[0].value.getTime(),
      ).toBe(24 * 60 * 60 * 1000);

      expect(findOptions?.where?.status).toBe(AppointmentStatus.CONFIRMED);
      expect(findOptions?.where?.reminderSent).toBe(false);
    });

    it('should not send reminders when there are no appointments', async () => {
      appointmentRepository.find.mockResolvedValue([]);

      await service.sendDailyAppointmentReminders();

      expect(appointmentRepository.find).toHaveBeenCalledTimes(1);

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('should skip an appointment when the user does not exist', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: undefined,
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
        status: AppointmentStatus.CONFIRMED,
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('should skip an appointment when the user email is missing', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: {
          name: 'Juan Pérez',
          email: undefined,
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
        status: AppointmentStatus.CONFIRMED,
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('should use "Cliente" when the user name is missing', async () => {
      const startAt = new Date('2026-10-08T10:00:00.000Z');

      const appointment = {
        id: 'appointment-1',
        startAt,
        user: {
          email: 'juan@example.com',
          name: undefined,
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
        status: AppointmentStatus.CONFIRMED,
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'juan@example.com',
        'Cliente',
        'Consulta',
        'Dr. García',
        startAt,
      );
    });

    it('should use "No especificado" when the service is missing', async () => {
      const startAt = new Date('2026-10-08T10:00:00.000Z');

      const appointment = {
        id: 'appointment-1',
        startAt,
        user: {
          email: 'juan@example.com',
          name: 'Juan Pérez',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: undefined,
        status: AppointmentStatus.CONFIRMED,
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'juan@example.com',
        'Juan Pérez',
        'No especificado',
        'Dr. García',
        startAt,
      );
    });

    it('should use "No especificado" when the professional is missing', async () => {
      const startAt = new Date('2026-10-08T10:00:00.000Z');

      const appointment = {
        id: 'appointment-1',
        startAt,
        user: {
          email: 'juan@example.com',
          name: 'Juan Pérez',
        },
        professional: undefined,
        service: {
          name: 'Consulta',
        },
        status: AppointmentStatus.CONFIRMED,
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'juan@example.com',
        'Juan Pérez',
        'Consulta',
        'No especificado',
        startAt,
      );
    });

    it('should use "No especificado" when professional user is missing', async () => {
      const startAt = new Date('2026-10-08T10:00:00.000Z');

      const appointment = {
        id: 'appointment-1',
        startAt,
        user: {
          email: 'juan@example.com',
          name: 'Juan Pérez',
        },
        professional: {
          user: undefined,
        },
        service: {
          name: 'Consulta',
        },
        status: AppointmentStatus.CONFIRMED,
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'juan@example.com',
        'Juan Pérez',
        'Consulta',
        'No especificado',
        startAt,
      );
    });

    it('should continue processing other appointments when one notification fails', async () => {
      const firstStartAt = new Date('2026-10-08T10:00:00.000Z');
      const secondStartAt = new Date('2026-10-08T11:00:00.000Z');

      const appointments = [
        {
          id: 'appointment-1',
          startAt: firstStartAt,
          user: {
            email: 'juan@example.com',
            name: 'Juan Pérez',
          },
          professional: {
            user: {
              name: 'Dr. García',
            },
          },
          service: {
            name: 'Consulta',
          },
        },
        {
          id: 'appointment-2',
          startAt: secondStartAt,
          user: {
            email: 'maria@example.com',
            name: 'María López',
          },
          professional: {
            user: {
              name: 'Dra. Rodríguez',
            },
          },
          service: {
            name: 'Control',
          },
        },
      ] as unknown as Appointment[];

      appointmentRepository.find.mockResolvedValue(appointments);

      notificationsService.sendAppointmentReminder
        .mockRejectedValueOnce(new Error('SMTP connection failed'))
        .mockResolvedValueOnce(undefined);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(2);

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        2,
        'maria@example.com',
        'María López',
        'Control',
        'Dra. Rodríguez',
        secondStartAt,
      );
    });

    it('should handle non-Error values thrown by the notification service', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: {
          email: 'juan@example.com',
          name: 'Juan Pérez',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      notificationsService.sendAppointmentReminder.mockRejectedValue(
        'SMTP error',
      );

      await expect(
        service.sendDailyAppointmentReminders(),
      ).resolves.toBeUndefined();

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors without throwing', async () => {
      const repositoryError = new Error('Database connection failed');

      appointmentRepository.find.mockRejectedValue(repositoryError);

      await expect(
        service.sendDailyAppointmentReminders(),
      ).resolves.toBeUndefined();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('should handle non-Error repository failures without throwing', async () => {
      appointmentRepository.find.mockRejectedValue('Database failure');

      await expect(
        service.sendDailyAppointmentReminders(),
      ).resolves.toBeUndefined();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('should process appointments sequentially', async () => {
      const calls: string[] = [];

      const appointments = [
        {
          id: 'appointment-1',
          startAt: new Date('2026-10-08T10:00:00.000Z'),
          user: {
            email: 'first@example.com',
            name: 'First',
          },
          professional: {
            user: {
              name: 'Professional 1',
            },
          },
          service: {
            name: 'Service 1',
          },
        },
        {
          id: 'appointment-2',
          startAt: new Date('2026-10-08T11:00:00.000Z'),
          user: {
            email: 'second@example.com',
            name: 'Second',
          },
          professional: {
            user: {
              name: 'Professional 2',
            },
          },
          service: {
            name: 'Service 2',
          },
        },
      ] as unknown as Appointment[];

      appointmentRepository.find.mockResolvedValue(appointments);

      notificationsService.sendAppointmentReminder.mockImplementation(
        async (email) => {
          calls.push(`start-${email}`);

          await Promise.resolve();

          calls.push(`end-${email}`);
        },
      );

      await service.sendDailyAppointmentReminders();

      expect(calls).toEqual([
        'start-first@example.com',
        'end-first@example.com',
        'start-second@example.com',
        'end-second@example.com',
      ]);
    });
  });

  describe('logging', () => {
    let logSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);

      warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
    });

    it('should log when no appointments are found', async () => {
      appointmentRepository.find.mockResolvedValue([]);

      await service.sendDailyAppointmentReminders();

      expect(logSpy).toHaveBeenCalledWith(
        'No hay turnos pendientes de recordatorio en las próximas 24 horas.',
      );
    });

    it('should log a warning when an appointment has no email', async () => {
      const appointment = {
        id: 'appointment-1',
        user: {
          name: 'Juan Pérez',
          email: undefined,
        },
      } as unknown as Appointment;

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(warnSpy).toHaveBeenCalledWith(
        'El turno appointment-1 no cuenta con un correo electrónico asignado.',
      );
    });

    it('should log notification errors', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: {
          email: 'juan@example.com',
          name: 'Juan Pérez',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      } as unknown as Appointment;

      const notificationError = new Error('SMTP failed');

      appointmentRepository.find.mockResolvedValue([appointment]);

      notificationsService.sendAppointmentReminder.mockRejectedValue(
        notificationError,
      );

      await service.sendDailyAppointmentReminders();

      expect(errorSpy).toHaveBeenCalledWith(
        'No se pudo procesar el recordatorio del turno appointment-1: SMTP failed',
      );
    });

    it('should log repository errors', async () => {
      const repositoryError = new Error('Database unavailable');

      appointmentRepository.find.mockRejectedValue(repositoryError);

      await service.sendDailyAppointmentReminders();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error general en el cron de recordatorios:',
        repositoryError.stack,
      );
    });

    it('should log non-Error repository failures using String()', async () => {
      appointmentRepository.find.mockRejectedValue('Database unavailable');

      await service.sendDailyAppointmentReminders();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error general en el cron de recordatorios:',
        'Database unavailable',
      );
    });
  });
});
