import { Logger } from '@nestjs/common';
import { UserRole } from 'src/common/userRoles.enum';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AppointmentStatus } from './entities/appointment.entity';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentsRepository: jest.Mocked<AppointmentsRepository>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(() => {
    appointmentsRepository = {
      getAllAppointments: jest.fn(),
      getAppointmentById: jest.fn(),
      getAppointmentsByUserId: jest.fn(),
      getAppointmentsByProfessionalId: jest.fn(),
      cancelAppointment: jest.fn(),
      rescheduleAppointment: jest.fn(),
      completeAppointment: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      getAvailableSlots: jest.fn(),
    } as unknown as jest.Mocked<AppointmentsRepository>;

    notificationsService = {
      sendAppointmentCancelled: jest.fn(),
      sendAppointmentRescheduled: jest.fn(),
      sendAppointmentConfirmedByAdmin: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    service = new AppointmentsService(
      appointmentsRepository,
      notificationsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('getAllAppointments', () => {
    it('should return all appointments from repository', async () => {
      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsRepository.getAllAppointments.mockResolvedValue(
        appointments as any,
      );

      const result = await service.getAllAppointments();

      expect(appointmentsRepository.getAllAppointments).toHaveBeenCalledTimes(
        1,
      );

      expect(result).toEqual(appointments);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      appointmentsRepository.getAllAppointments.mockRejectedValue(error);

      await expect(service.getAllAppointments()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should return the appointment from repository', async () => {
      const appointment = {
        id: 'appointment-1',
      };

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      const result = await service.getAppointmentById('appointment-1');

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledWith(
        'appointment-1',
      );

      expect(result).toEqual(appointment);
    });

    it('should propagate repository errors', async () => {
      appointmentsRepository.getAppointmentById.mockRejectedValue(
        new Error('Appointment not found'),
      );

      await expect(service.getAppointmentById('appointment-1')).rejects.toThrow(
        'Appointment not found',
      );
    });
  });

  describe('getAppointmentsByUserId', () => {
    it('should return appointments for the given user', async () => {
      const userId = 'user-123';

      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsRepository.getAppointmentsByUserId.mockResolvedValue(
        appointments as any,
      );

      const result = await service.getAppointmentsByUserId(userId);

      expect(
        appointmentsRepository.getAppointmentsByUserId,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsRepository.getAppointmentsByUserId,
      ).toHaveBeenCalledWith(userId);

      expect(result).toEqual(appointments);
    });

    it('should propagate repository errors', async () => {
      appointmentsRepository.getAppointmentsByUserId.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(service.getAppointmentsByUserId('user-123')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getAppointmentsByProfessionalId', () => {
    it('should return appointments for the given professional', async () => {
      const professionalId = 'professional-123';

      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsRepository.getAppointmentsByProfessionalId.mockResolvedValue(
        appointments as any,
      );

      const result =
        await service.getAppointmentsByProfessionalId(professionalId);

      expect(
        appointmentsRepository.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsRepository.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledWith(professionalId);

      expect(result).toEqual(appointments);
    });

    it('should propagate repository errors', async () => {
      appointmentsRepository.getAppointmentsByProfessionalId.mockRejectedValue(
        new Error('Professional not found'),
      );

      await expect(
        service.getAppointmentsByProfessionalId('professional-123'),
      ).rejects.toThrow('Professional not found');
    });
  });

  describe('cancelAppointment', () => {
    const appointment = {
      id: 'appointment-1',
      startAt: new Date('2026-10-08T10:00:00.000Z'),
      user: {
        email: 'client@example.com',
        name: 'Juan Pérez',
      },
      service: {
        name: 'Consulta médica',
      },
      professional: {
        user: {
          name: 'Dr. García',
        },
      },
    };

    const cancelledAppointment = {
      ...appointment,
      status: AppointmentStatus.CANCELLED,
    };

    it('should get the appointment, cancel it and send a cancellation notification', async () => {
      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockResolvedValue(
        cancelledAppointment as any,
      );

      notificationsService.sendAppointmentCancelled.mockResolvedValue(
        undefined,
      );

      const result = await service.cancelAppointment('appointment-1');

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledWith(
        'appointment-1',
      );

      expect(appointmentsRepository.cancelAppointment).toHaveBeenCalledTimes(1);

      expect(appointmentsRepository.cancelAppointment).toHaveBeenCalledWith(
        'appointment-1',
      );

      expect(
        notificationsService.sendAppointmentCancelled,
      ).toHaveBeenCalledTimes(1);

      expect(
        notificationsService.sendAppointmentCancelled,
      ).toHaveBeenCalledWith(
        'client@example.com',
        'Juan Pérez',
        'Consulta médica',
        'Dr. García',
        appointment.startAt,
      );

      expect(result).toEqual(cancelledAppointment);
    });

    it('should cancel the appointment before sending the notification', async () => {
      const calls: string[] = [];

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockImplementation(async () => {
        calls.push('cancel');

        return cancelledAppointment as any;
      });

      notificationsService.sendAppointmentCancelled.mockImplementation(
        async () => {
          calls.push('notification');
        },
      );

      await service.cancelAppointment('appointment-1');

      expect(calls).toEqual(['cancel', 'notification']);
    });

    it('should use "No especificado" when the professional is missing', async () => {
      const appointmentWithoutProfessional = {
        ...appointment,
        professional: undefined,
      };

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointmentWithoutProfessional as any,
      );

      appointmentsRepository.cancelAppointment.mockResolvedValue(
        cancelledAppointment as any,
      );

      await service.cancelAppointment('appointment-1');

      expect(
        notificationsService.sendAppointmentCancelled,
      ).toHaveBeenCalledWith(
        'client@example.com',
        'Juan Pérez',
        'Consulta médica',
        'No especificado',
        appointment.startAt,
      );
    });

    it('should return the cancellation result when notification fails', async () => {
      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockResolvedValue(
        cancelledAppointment as any,
      );

      notificationsService.sendAppointmentCancelled.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await service.cancelAppointment('appointment-1');

      expect(result).toEqual(cancelledAppointment);
    });

    it('should handle non-Error notification failures', async () => {
      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockResolvedValue(
        cancelledAppointment as any,
      );

      notificationsService.sendAppointmentCancelled.mockRejectedValue(
        'Email service unavailable',
      );

      await expect(service.cancelAppointment('appointment-1')).resolves.toEqual(
        cancelledAppointment,
      );
    });

    it('should not send a notification when getting the appointment fails', async () => {
      appointmentsRepository.getAppointmentById.mockRejectedValue(
        new Error('Appointment not found'),
      );

      await expect(service.cancelAppointment('appointment-1')).rejects.toThrow(
        'Appointment not found',
      );

      expect(appointmentsRepository.cancelAppointment).not.toHaveBeenCalled();

      expect(
        notificationsService.sendAppointmentCancelled,
      ).not.toHaveBeenCalled();
    });

    it('should not send a notification when cancellation fails', async () => {
      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockRejectedValue(
        new Error('Cannot cancel appointment'),
      );

      await expect(service.cancelAppointment('appointment-1')).rejects.toThrow(
        'Cannot cancel appointment',
      );

      expect(
        notificationsService.sendAppointmentCancelled,
      ).not.toHaveBeenCalled();
    });
  });

  describe('rescheduleAppointment', () => {
    const appointmentId = 'appointment-1';

    const dto = {
      startAt: '2026-10-09T10:00:00.000Z',
    } as unknown as RescheduleAppointmentDto;

    const updatedAppointment = {
      id: appointmentId,
      startAt: new Date('2026-10-09T10:00:00.000Z'),
      user: {
        email: 'client@example.com',
        name: 'Juan Pérez',
      },
      service: {
        name: 'Consulta médica',
      },
      professional: {
        user: {
          name: 'Dr. García',
        },
      },
    };

    const repositoryResult = {
      id: appointmentId,
      startAt: updatedAppointment.startAt,
    };

    it('should reschedule the appointment and send a notification', async () => {
      appointmentsRepository.rescheduleAppointment.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        updatedAppointment as any,
      );

      notificationsService.sendAppointmentRescheduled.mockResolvedValue(
        undefined,
      );

      const result = await service.rescheduleAppointment(appointmentId, dto);

      expect(
        appointmentsRepository.rescheduleAppointment,
      ).toHaveBeenCalledTimes(1);

      expect(appointmentsRepository.rescheduleAppointment).toHaveBeenCalledWith(
        appointmentId,
        dto,
      );

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledWith(
        appointmentId,
      );

      expect(
        notificationsService.sendAppointmentRescheduled,
      ).toHaveBeenCalledTimes(1);

      expect(
        notificationsService.sendAppointmentRescheduled,
      ).toHaveBeenCalledWith(
        'client@example.com',
        'Juan Pérez',
        'Consulta médica',
        'Dr. García',
        updatedAppointment.startAt,
      );

      expect(result).toEqual(repositoryResult);
    });

    it('should retrieve the updated appointment before sending the notification', async () => {
      const calls: string[] = [];

      appointmentsRepository.rescheduleAppointment.mockImplementation(
        async () => {
          calls.push('reschedule');

          return repositoryResult as any;
        },
      );

      appointmentsRepository.getAppointmentById.mockImplementation(async () => {
        calls.push('get-updated-appointment');

        return updatedAppointment as any;
      });

      notificationsService.sendAppointmentRescheduled.mockImplementation(
        async () => {
          calls.push('notification');
        },
      );

      await service.rescheduleAppointment(appointmentId, dto);

      expect(calls).toEqual([
        'reschedule',
        'get-updated-appointment',
        'notification',
      ]);
    });

    it('should use "No especificado" when the professional is missing', async () => {
      const appointmentWithoutProfessional = {
        ...updatedAppointment,
        professional: undefined,
      };

      appointmentsRepository.rescheduleAppointment.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointmentWithoutProfessional as any,
      );

      await service.rescheduleAppointment(appointmentId, dto);

      expect(
        notificationsService.sendAppointmentRescheduled,
      ).toHaveBeenCalledWith(
        'client@example.com',
        'Juan Pérez',
        'Consulta médica',
        'No especificado',
        updatedAppointment.startAt,
      );
    });

    it('should return the repository result when notification fails', async () => {
      appointmentsRepository.rescheduleAppointment.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        updatedAppointment as any,
      );

      notificationsService.sendAppointmentRescheduled.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await service.rescheduleAppointment(appointmentId, dto);

      expect(result).toEqual(repositoryResult);
    });

    it('should handle non-Error notification failures', async () => {
      appointmentsRepository.rescheduleAppointment.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        updatedAppointment as any,
      );

      notificationsService.sendAppointmentRescheduled.mockRejectedValue(
        'Email service unavailable',
      );

      await expect(
        service.rescheduleAppointment(appointmentId, dto),
      ).resolves.toEqual(repositoryResult);
    });

    it('should not send a notification when rescheduling fails', async () => {
      appointmentsRepository.rescheduleAppointment.mockRejectedValue(
        new Error('Cannot reschedule appointment'),
      );

      await expect(
        service.rescheduleAppointment(appointmentId, dto),
      ).rejects.toThrow('Cannot reschedule appointment');

      expect(appointmentsRepository.getAppointmentById).not.toHaveBeenCalled();

      expect(
        notificationsService.sendAppointmentRescheduled,
      ).not.toHaveBeenCalled();
    });

    it('should return the repository result when retrieving the updated appointment fails', async () => {
      appointmentsRepository.rescheduleAppointment.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockRejectedValue(
        new Error('Could not retrieve updated appointment'),
      );

      const result = await service.rescheduleAppointment(appointmentId, dto);

      expect(result).toEqual(repositoryResult);

      expect(
        notificationsService.sendAppointmentRescheduled,
      ).not.toHaveBeenCalled();
    });
  });

  describe('completeAppointment', () => {
    const userId = 'user-1';
    const roles = [UserRole.PROFESSIONAL];

    it('should complete the appointment using the repository', async () => {
      const appointmentId = 'appointment-1';

      const completedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED,
      };

      appointmentsRepository.completeAppointment.mockResolvedValue(
        completedAppointment as any,
      );

      const result = await service.completeAppointment(
        appointmentId,
        userId,
        roles,
      );

      expect(appointmentsRepository.completeAppointment).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsRepository.completeAppointment).toHaveBeenCalledWith(
        appointmentId,
        userId,
        roles,
      );

      expect(result).toEqual(completedAppointment);
    });

    it('should propagate repository errors', async () => {
      appointmentsRepository.completeAppointment.mockRejectedValue(
        new Error('Cannot complete appointment'),
      );

      await expect(
        service.completeAppointment('appointment-1', userId, roles),
      ).rejects.toThrow('Cannot complete appointment');
    });
  });

  describe('updateAppointmentStatus', () => {
    const appointmentId = 'appointment-1';

    const appointment = {
      id: appointmentId,
      startAt: new Date('2026-10-08T10:00:00.000Z'),
      user: {
        email: 'client@example.com',
        name: 'Juan Pérez',
      },
      service: {
        name: 'Consulta médica',
      },
      professional: {
        user: {
          name: 'Dr. García',
        },
      },
    };

    const repositoryResult = {
      ...appointment,
      status: AppointmentStatus.CONFIRMED,
    };

    it('should update the appointment status', async () => {
      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        repositoryResult as any,
      );

      const result = await service.updateAppointmentStatus(
        appointmentId,
        AppointmentStatus.CANCELLED,
      );

      expect(
        appointmentsRepository.updateAppointmentStatus,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsRepository.updateAppointmentStatus,
      ).toHaveBeenCalledWith(appointmentId, AppointmentStatus.CANCELLED);

      expect(result).toEqual(repositoryResult);
    });

    it('should send a confirmation notification when status is CONFIRMED', async () => {
      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      notificationsService.sendAppointmentConfirmedByAdmin.mockResolvedValue(
        undefined,
      );

      const result = await service.updateAppointmentStatus(
        appointmentId,
        AppointmentStatus.CONFIRMED,
      );

      expect(
        appointmentsRepository.updateAppointmentStatus,
      ).toHaveBeenCalledWith(appointmentId, AppointmentStatus.CONFIRMED);

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsRepository.getAppointmentById).toHaveBeenCalledWith(
        appointmentId,
      );

      expect(
        notificationsService.sendAppointmentConfirmedByAdmin,
      ).toHaveBeenCalledTimes(1);

      expect(
        notificationsService.sendAppointmentConfirmedByAdmin,
      ).toHaveBeenCalledWith(
        'client@example.com',
        'Juan Pérez',
        'Consulta médica',
        'Dr. García',
        appointment.startAt,
      );

      expect(result).toEqual(repositoryResult);
    });

    it('should not retrieve the appointment or send a notification for non-CONFIRMED status', async () => {
      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        repositoryResult as any,
      );

      const result = await service.updateAppointmentStatus(
        appointmentId,
        AppointmentStatus.CANCELLED,
      );

      expect(appointmentsRepository.getAppointmentById).not.toHaveBeenCalled();

      expect(
        notificationsService.sendAppointmentConfirmedByAdmin,
      ).not.toHaveBeenCalled();

      expect(result).toEqual(repositoryResult);
    });

    it('should update the status before sending the confirmation notification', async () => {
      const calls: string[] = [];

      appointmentsRepository.updateAppointmentStatus.mockImplementation(
        async () => {
          calls.push('update-status');

          return repositoryResult as any;
        },
      );

      appointmentsRepository.getAppointmentById.mockImplementation(async () => {
        calls.push('get-appointment');

        return appointment as any;
      });

      notificationsService.sendAppointmentConfirmedByAdmin.mockImplementation(
        async () => {
          calls.push('notification');
        },
      );

      await service.updateAppointmentStatus(
        appointmentId,
        AppointmentStatus.CONFIRMED,
      );

      expect(calls).toEqual([
        'update-status',
        'get-appointment',
        'notification',
      ]);
    });

    it('should return the result when confirmation notification fails', async () => {
      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      notificationsService.sendAppointmentConfirmedByAdmin.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await service.updateAppointmentStatus(
        appointmentId,
        AppointmentStatus.CONFIRMED,
      );

      expect(result).toEqual(repositoryResult);
    });

    it('should handle non-Error confirmation notification failures', async () => {
      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      notificationsService.sendAppointmentConfirmedByAdmin.mockRejectedValue(
        'Email service unavailable',
      );

      await expect(
        service.updateAppointmentStatus(
          appointmentId,
          AppointmentStatus.CONFIRMED,
        ),
      ).resolves.toEqual(repositoryResult);
    });

    it('should not retrieve the appointment when updating the status fails', async () => {
      appointmentsRepository.updateAppointmentStatus.mockRejectedValue(
        new Error('Cannot update appointment status'),
      );

      await expect(
        service.updateAppointmentStatus(
          appointmentId,
          AppointmentStatus.CONFIRMED,
        ),
      ).rejects.toThrow('Cannot update appointment status');

      expect(appointmentsRepository.getAppointmentById).not.toHaveBeenCalled();

      expect(
        notificationsService.sendAppointmentConfirmedByAdmin,
      ).not.toHaveBeenCalled();
    });

    it('should return the result when retrieving the appointment for confirmation fails', async () => {
      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        repositoryResult as any,
      );

      appointmentsRepository.getAppointmentById.mockRejectedValue(
        new Error('Appointment not found'),
      );

      const result = await service.updateAppointmentStatus(
        appointmentId,
        AppointmentStatus.CONFIRMED,
      );

      expect(result).toEqual(repositoryResult);

      expect(
        notificationsService.sendAppointmentConfirmedByAdmin,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots from repository', async () => {
      const professionalId = 'professional-123';
      const serviceId = 'service-123';
      const date = '2026-10-08';
      const appointmentId = 'appointment-123';

      const slots = ['09:00', '10:00', '11:00'];

      appointmentsRepository.getAvailableSlots.mockResolvedValue(slots as any);

      const result = await service.getAvailableSlots(
        professionalId,
        serviceId,
        date,
        appointmentId,
      );

      expect(appointmentsRepository.getAvailableSlots).toHaveBeenCalledTimes(1);

      expect(appointmentsRepository.getAvailableSlots).toHaveBeenCalledWith(
        professionalId,
        serviceId,
        date,
        appointmentId,
      );

      expect(result).toEqual(slots);
    });

    it('should work without appointmentId', async () => {
      const slots = ['09:00', '10:00'];

      appointmentsRepository.getAvailableSlots.mockResolvedValue(slots as any);

      const result = await service.getAvailableSlots(
        'professional-123',
        'service-123',
        '2026-10-08',
      );

      expect(appointmentsRepository.getAvailableSlots).toHaveBeenCalledWith(
        'professional-123',
        'service-123',
        '2026-10-08',
        undefined,
      );

      expect(result).toEqual(slots);
    });

    it('should propagate repository errors', async () => {
      appointmentsRepository.getAvailableSlots.mockRejectedValue(
        new Error('Unable to calculate available slots'),
      );

      await expect(
        service.getAvailableSlots(
          'professional-123',
          'service-123',
          '2026-10-08',
        ),
      ).rejects.toThrow('Unable to calculate available slots');
    });
  });

  describe('logging', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
    });

    it('should log an error when cancellation notification fails', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: {
          email: 'client@example.com',
          name: 'Juan Pérez',
        },
        service: {
          name: 'Consulta',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
      };

      const result = {
        ...appointment,
        status: AppointmentStatus.CANCELLED,
      };

      const notificationError = new Error('SMTP error');

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockResolvedValue(result as any);

      notificationsService.sendAppointmentCancelled.mockRejectedValue(
        notificationError,
      );

      await service.cancelAppointment('appointment-1');

      expect(errorSpy).toHaveBeenCalledWith(
        'El turno fue cancelado pero no se pudo enviar el correo de cancelación',
        notificationError.stack,
      );
    });

    it('should log a non-Error cancellation notification failure', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: {
          email: 'client@example.com',
          name: 'Juan Pérez',
        },
        service: {
          name: 'Consulta',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
      };

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.cancelAppointment.mockResolvedValue(
        appointment as any,
      );

      notificationsService.sendAppointmentCancelled.mockRejectedValue(
        'SMTP error',
      );

      await service.cancelAppointment('appointment-1');

      expect(errorSpy).toHaveBeenCalledWith(
        'El turno fue cancelado pero no se pudo enviar el correo de cancelación',
        'SMTP error',
      );
    });

    it('should log an error when rescheduling notification fails', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-09T10:00:00.000Z'),
        user: {
          email: 'client@example.com',
          name: 'Juan Pérez',
        },
        service: {
          name: 'Consulta',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
      };

      appointmentsRepository.rescheduleAppointment.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      const notificationError = new Error('SMTP error');

      notificationsService.sendAppointmentRescheduled.mockRejectedValue(
        notificationError,
      );

      await service.rescheduleAppointment(
        'appointment-1',
        {} as RescheduleAppointmentDto,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'El turno fue reprogramado pero no se pudo enviar el correo de reprogramación',
        notificationError.stack,
      );
    });

    it('should log an error when confirmation notification fails', async () => {
      const appointment = {
        id: 'appointment-1',
        startAt: new Date('2026-10-08T10:00:00.000Z'),
        user: {
          email: 'client@example.com',
          name: 'Juan Pérez',
        },
        service: {
          name: 'Consulta',
        },
        professional: {
          user: {
            name: 'Dr. García',
          },
        },
      };

      appointmentsRepository.updateAppointmentStatus.mockResolvedValue(
        appointment as any,
      );

      appointmentsRepository.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      const notificationError = new Error('SMTP error');

      notificationsService.sendAppointmentConfirmedByAdmin.mockRejectedValue(
        notificationError,
      );

      await service.updateAppointmentStatus(
        'appointment-1',
        AppointmentStatus.CONFIRMED,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'El turno fue confirmado pero no se pudo enviar el correo de confirmación',
        notificationError.stack,
      );
    });
  });
});
