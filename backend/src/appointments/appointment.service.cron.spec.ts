jest.mock('@nestjs/schedule', () => ({
  Cron: jest.fn(() => () => {}),
  CronExpression: {
    EVERY_DAY_AT_8AM: '0 8 * * *',
  },
}));

import { AppointmentCronService } from './appointment.service.cron';
import { AppointmentStatus } from './entities/appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Repository } from 'typeorm';

describe('AppointmentCronService', () => {
  let service: AppointmentCronService;

  let appointmentRepository: {
    find: jest.Mock;
  };

  let notificationsService: {
    sendAppointmentReminder: jest.Mock;
  };

  beforeEach(() => {
    appointmentRepository = {
      find: jest.fn(),
    };

    notificationsService = {
      sendAppointmentReminder: jest.fn(),
    };

    service = new AppointmentCronService(
      appointmentRepository as unknown as Repository<any>,
      notificationsService as unknown as NotificationsService,
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sendDailyAppointmentReminders', () => {
    it('debería buscar los turnos confirmados correspondientes a mañana', async () => {
      appointmentRepository.find.mockResolvedValue([]);

      await service.sendDailyAppointmentReminders();

      expect(appointmentRepository.find).toHaveBeenCalledTimes(1);

      const [query] = appointmentRepository.find.mock.calls[0];

      expect(query).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AppointmentStatus.CONFIRMED,
          }),
          relations: ['user', 'professional', 'professional.user', 'service'],
        }),
      );

      expect(query.where.startAt).toBeDefined();
    });

    it('no debería enviar notificaciones si no existen turnos', async () => {
      appointmentRepository.find.mockResolvedValue([]);

      await service.sendDailyAppointmentReminders();

      expect(appointmentRepository.find).toHaveBeenCalledTimes(1);

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('debería enviar un recordatorio para un turno válido', async () => {
      const startAt = new Date('2026-10-02T10:00:00.000Z');

      const appointment = {
        id: 1,
        startAt,
        user: {
          email: 'cliente@test.com',
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
      };

      appointmentRepository.find.mockResolvedValue([appointment]);
      notificationsService.sendAppointmentReminder.mockResolvedValue(undefined);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(1);

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'cliente@test.com',
        'Juan Pérez',
        'Consulta médica',
        'Dr. García',
        startAt,
      );
    });

    it('debería enviar recordatorios para todos los turnos válidos', async () => {
      const appointment1 = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: 'cliente1@test.com',
          name: 'Juan',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      };

      const appointment2 = {
        id: 2,
        startAt: new Date('2026-10-02T11:00:00.000Z'),
        user: {
          email: 'cliente2@test.com',
          name: 'Pedro',
        },
        professional: {
          user: {
            name: 'Dra. López',
          },
        },
        service: {
          name: 'Control',
        },
      };

      appointmentRepository.find.mockResolvedValue([
        appointment1,
        appointment2,
      ]);

      notificationsService.sendAppointmentReminder.mockResolvedValue(undefined);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(2);

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        1,
        'cliente1@test.com',
        'Juan',
        'Consulta',
        'Dr. García',
        appointment1.startAt,
      );

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        2,
        'cliente2@test.com',
        'Pedro',
        'Control',
        'Dra. López',
        appointment2.startAt,
      );
    });

    it('debería saltear un turno que no tenga usuario', async () => {
      const appointment = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: null,
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      };

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('debería saltear un turno que no tenga email', async () => {
      const appointment = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: null,
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
      };

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('debería usar "Cliente" cuando el usuario no tenga nombre', async () => {
      const appointment = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: 'cliente@test.com',
          name: '',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      };

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'cliente@test.com',
        'Cliente',
        'Consulta',
        'Dr. García',
        appointment.startAt,
      );
    });

    it('debería usar "No especificado" cuando falte el servicio', async () => {
      const appointment = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: 'cliente@test.com',
          name: 'Juan',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: null,
      };

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'cliente@test.com',
        'Juan',
        'No especificado',
        'Dr. García',
        appointment.startAt,
      );
    });

    it('debería usar "No especificado" cuando falte el profesional', async () => {
      const appointment = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: 'cliente@test.com',
          name: 'Juan',
        },
        professional: null,
        service: {
          name: 'Consulta',
        },
      };

      appointmentRepository.find.mockResolvedValue([appointment]);

      await service.sendDailyAppointmentReminders();

      expect(notificationsService.sendAppointmentReminder).toHaveBeenCalledWith(
        'cliente@test.com',
        'Juan',
        'Consulta',
        'No especificado',
        appointment.startAt,
      );
    });

    it('debería continuar procesando los demás turnos si falla el envío de un email', async () => {
      const appointment1 = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: 'error@test.com',
          name: 'Juan',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      };

      const appointment2 = {
        id: 2,
        startAt: new Date('2026-10-02T11:00:00.000Z'),
        user: {
          email: 'success@test.com',
          name: 'Pedro',
        },
        professional: {
          user: {
            name: 'Dra. López',
          },
        },
        service: {
          name: 'Control',
        },
      };

      appointmentRepository.find.mockResolvedValue([
        appointment1,
        appointment2,
      ]);

      notificationsService.sendAppointmentReminder
        .mockRejectedValueOnce(new Error('Error enviando email'))
        .mockResolvedValueOnce(undefined);

      await service.sendDailyAppointmentReminders();

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(2);

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        1,
        'error@test.com',
        'Juan',
        'Consulta',
        'Dr. García',
        appointment1.startAt,
      );

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenNthCalledWith(
        2,
        'success@test.com',
        'Pedro',
        'Control',
        'Dra. López',
        appointment2.startAt,
      );
    });

    it('debería manejar errores del repositorio sin lanzar la excepción', async () => {
      const repositoryError = new Error('Database connection error');

      appointmentRepository.find.mockRejectedValue(repositoryError);

      await expect(
        service.sendDailyAppointmentReminders(),
      ).resolves.toBeUndefined();

      expect(
        notificationsService.sendAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('debería manejar errores de envío que no sean instancias de Error', async () => {
      const appointment = {
        id: 1,
        startAt: new Date('2026-10-02T10:00:00.000Z'),
        user: {
          email: 'cliente@test.com',
          name: 'Juan',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
        service: {
          name: 'Consulta',
        },
      };

      appointmentRepository.find.mockResolvedValue([appointment]);

      notificationsService.sendAppointmentReminder.mockRejectedValue(
        'Error de email',
      );

      await expect(
        service.sendDailyAppointmentReminders(),
      ).resolves.toBeUndefined();

      expect(
        notificationsService.sendAppointmentReminder,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
