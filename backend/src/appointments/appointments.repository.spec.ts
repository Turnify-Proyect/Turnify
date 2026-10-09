import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from './entities/appointment.entity';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let appointmentsService: jest.Mocked<AppointmentsService>;

  beforeEach(() => {
    appointmentsService = {
      getAllAppointments: jest.fn(),
      getAppointmentsByUserId: jest.fn(),
      getAvailableSlots: jest.fn(),
      getAppointmentById: jest.fn(),
      getAppointmentsByProfessionalId: jest.fn(),
      cancelAppointment: jest.fn(),
      rescheduleAppointment: jest.fn(),
      completeAppointment: jest.fn(),
      updateAppointmentStatus: jest.fn(),
    } as unknown as jest.Mocked<AppointmentsService>;

    controller = new AppointmentsController(appointmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllAppointments', () => {
    it('should call appointmentsService.getAllAppointments', async () => {
      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsService.getAllAppointments.mockResolvedValue(
        appointments as any,
      );

      const result = await controller.getAllAppointments();

      expect(appointmentsService.getAllAppointments).toHaveBeenCalledTimes(1);

      expect(result).toEqual(appointments);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');

      appointmentsService.getAllAppointments.mockRejectedValue(error);

      await expect(controller.getAllAppointments()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getMyAppointments', () => {
    it('should get appointments using the authenticated user id', async () => {
      const userId = 'user-123';

      const req = {
        user: {
          id: userId,
        },
      };

      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsService.getAppointmentsByUserId.mockResolvedValue(
        appointments as any,
      );

      const result = await controller.getMyAppointments(req);

      expect(appointmentsService.getAppointmentsByUserId).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsService.getAppointmentsByUserId).toHaveBeenCalledWith(
        userId,
      );

      expect(result).toEqual(appointments);
    });

    it('should propagate service errors', async () => {
      const req = {
        user: {
          id: 'user-123',
        },
      };

      appointmentsService.getAppointmentsByUserId.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(controller.getMyAppointments(req)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getAvailableSlots', () => {
    it('should call the service with all provided parameters', async () => {
      const professionalId = 'professional-123';
      const serviceId = 'service-123';
      const date = '2026-10-08';
      const appointmentId = 'appointment-123';

      const slots = ['09:00', '10:00', '11:00'];

      appointmentsService.getAvailableSlots.mockResolvedValue(slots as any);

      const result = await controller.getAvailableSlots(
        professionalId,
        serviceId,
        date,
        appointmentId,
      );

      expect(appointmentsService.getAvailableSlots).toHaveBeenCalledTimes(1);

      expect(appointmentsService.getAvailableSlots).toHaveBeenCalledWith(
        professionalId,
        serviceId,
        date,
        appointmentId,
      );

      expect(result).toEqual(slots);
    });

    it('should call the service without appointmentId when it is not provided', async () => {
      const professionalId = 'professional-123';
      const serviceId = 'service-123';
      const date = '2026-10-08';

      appointmentsService.getAvailableSlots.mockResolvedValue([] as any);

      const result = await controller.getAvailableSlots(
        professionalId,
        serviceId,
        date,
      );

      expect(appointmentsService.getAvailableSlots).toHaveBeenCalledWith(
        professionalId,
        serviceId,
        date,
        undefined,
      );

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      appointmentsService.getAvailableSlots.mockRejectedValue(
        new Error('Professional not found'),
      );

      await expect(
        controller.getAvailableSlots(
          'professional-123',
          'service-123',
          '2026-10-08',
        ),
      ).rejects.toThrow('Professional not found');
    });
  });

  describe('getAppointmentById', () => {
    it('should call the service with the appointment id', async () => {
      const appointmentId = 'appointment-123';

      const appointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
      };

      appointmentsService.getAppointmentById.mockResolvedValue(
        appointment as any,
      );

      const result = await controller.getAppointmentById(appointmentId);

      expect(appointmentsService.getAppointmentById).toHaveBeenCalledTimes(1);

      expect(appointmentsService.getAppointmentById).toHaveBeenCalledWith(
        appointmentId,
      );

      expect(result).toEqual(appointment);
    });

    it('should propagate service errors', async () => {
      appointmentsService.getAppointmentById.mockRejectedValue(
        new Error('Appointment not found'),
      );

      await expect(
        controller.getAppointmentById('appointment-123'),
      ).rejects.toThrow('Appointment not found');
    });
  });

  describe('getAppointmentsByUserId', () => {
    it('should call the service with the user id', async () => {
      const userId = 'user-123';

      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsService.getAppointmentsByUserId.mockResolvedValue(
        appointments as any,
      );

      const result = await controller.getAppointmentsByUserId(userId);

      expect(appointmentsService.getAppointmentsByUserId).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsService.getAppointmentsByUserId).toHaveBeenCalledWith(
        userId,
      );

      expect(result).toEqual(appointments);
    });

    it('should propagate service errors', async () => {
      appointmentsService.getAppointmentsByUserId.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(
        controller.getAppointmentsByUserId('user-123'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getAppointmentsByProfessionalId', () => {
    it('should call the service with the professional id', async () => {
      const professionalId = 'professional-123';

      const appointments = [{ id: 'appointment-1' }, { id: 'appointment-2' }];

      appointmentsService.getAppointmentsByProfessionalId.mockResolvedValue(
        appointments as any,
      );

      const result =
        await controller.getAppointmentsByProfessionalId(professionalId);

      expect(
        appointmentsService.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledWith(professionalId);

      expect(result).toEqual(appointments);
    });

    it('should propagate service errors', async () => {
      appointmentsService.getAppointmentsByProfessionalId.mockRejectedValue(
        new Error('Professional not found'),
      );

      await expect(
        controller.getAppointmentsByProfessionalId('professional-123'),
      ).rejects.toThrow('Professional not found');
    });
  });

  describe('cancelAppointment', () => {
    it('should call the service with the appointment id', async () => {
      const appointmentId = 'appointment-123';

      const cancelledAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CANCELLED,
      };

      appointmentsService.cancelAppointment.mockResolvedValue(
        cancelledAppointment as any,
      );

      const result = await controller.cancelAppointment(appointmentId);

      expect(appointmentsService.cancelAppointment).toHaveBeenCalledTimes(1);

      expect(appointmentsService.cancelAppointment).toHaveBeenCalledWith(
        appointmentId,
      );

      expect(result).toEqual(cancelledAppointment);
    });

    it('should propagate service errors', async () => {
      appointmentsService.cancelAppointment.mockRejectedValue(
        new Error('Appointment cannot be cancelled'),
      );

      await expect(
        controller.cancelAppointment('appointment-123'),
      ).rejects.toThrow('Appointment cannot be cancelled');
    });
  });

  describe('rescheduleAppointment', () => {
    it('should call the service with appointment id and dto', async () => {
      const appointmentId = 'appointment-123';

      const rescheduleAppointmentDto = {
        startAt: '2026-10-09T10:00:00.000Z',
      } as unknown as RescheduleAppointmentDto;

      const rescheduledAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
        startAt: rescheduleAppointmentDto.startAt,
      };

      appointmentsService.rescheduleAppointment.mockResolvedValue(
        rescheduledAppointment as any,
      );

      const result = await controller.rescheduleAppointment(
        appointmentId,
        rescheduleAppointmentDto,
      );

      expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith(
        appointmentId,
        rescheduleAppointmentDto,
      );

      expect(result).toEqual(rescheduledAppointment);
    });

    it('should propagate service errors', async () => {
      const dto = {
        startAt: '2026-10-09T10:00:00.000Z',
      } as unknown as RescheduleAppointmentDto;

      appointmentsService.rescheduleAppointment.mockRejectedValue(
        new Error('Cannot reschedule appointment'),
      );

      await expect(
        controller.rescheduleAppointment('appointment-123', dto),
      ).rejects.toThrow('Cannot reschedule appointment');
    });
  });

  describe('completeAppointment', () => {
    it('should call the service with the appointment id', async () => {
      const appointmentId = 'appointment-123';

      const completedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED,
      };

      appointmentsService.completeAppointment.mockResolvedValue(
        completedAppointment as any,
      );

      const result = await controller.completeAppointment(appointmentId);

      expect(appointmentsService.completeAppointment).toHaveBeenCalledTimes(1);

      expect(appointmentsService.completeAppointment).toHaveBeenCalledWith(
        appointmentId,
      );

      expect(result).toEqual(completedAppointment);
    });

    it('should propagate service errors', async () => {
      appointmentsService.completeAppointment.mockRejectedValue(
        new Error('Appointment cannot be completed'),
      );

      await expect(
        controller.completeAppointment('appointment-123'),
      ).rejects.toThrow('Appointment cannot be completed');
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should call the service with appointment id and new status', async () => {
      const appointmentId = 'appointment-123';
      const newStatus = AppointmentStatus.CONFIRMED;

      const updatedAppointment = {
        id: appointmentId,
        status: newStatus,
      };

      appointmentsService.updateAppointmentStatus.mockResolvedValue(
        updatedAppointment as any,
      );

      const result = await controller.updateAppointmentStatus(
        appointmentId,
        newStatus,
      );

      expect(appointmentsService.updateAppointmentStatus).toHaveBeenCalledTimes(
        1,
      );

      expect(appointmentsService.updateAppointmentStatus).toHaveBeenCalledWith(
        appointmentId,
        newStatus,
      );

      expect(result).toEqual(updatedAppointment);
    });

    it('should propagate service errors', async () => {
      appointmentsService.updateAppointmentStatus.mockRejectedValue(
        new Error('Invalid appointment status'),
      );

      await expect(
        controller.updateAppointmentStatus(
          'appointment-123',
          AppointmentStatus.CONFIRMED,
        ),
      ).rejects.toThrow('Invalid appointment status');
    });
  });
});
