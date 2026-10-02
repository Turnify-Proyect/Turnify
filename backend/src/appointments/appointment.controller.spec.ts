import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from './entities/appointment.entity';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;

  let appointmentsService: {
    getAllAppointments: jest.Mock;
    getAppointmentsByUserId: jest.Mock;
    getAvailableSlots: jest.Mock;
    getAppointmentById: jest.Mock;
    getAppointmentsByProfessionalId: jest.Mock;
    cancelAppointment: jest.Mock;
    rescheduleAppointment: jest.Mock;
    completeAppointment: jest.Mock;
    updateAppointmentStatus: jest.Mock;
  };

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
    };

    controller = new AppointmentsController(
      appointmentsService as unknown as AppointmentsService,
    );

    jest.clearAllMocks();
  });

  describe('getAllAppointments', () => {
    it('debería obtener todos los turnos', async () => {
      const appointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' },
      ];

      appointmentsService.getAllAppointments.mockResolvedValue(appointments);

      const result = await controller.getAllAppointments();

      expect(
        appointmentsService.getAllAppointments,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAllAppointments,
      ).toHaveBeenCalledWith();

      expect(result).toBe(appointments);
    });
  });

  describe('getMyAppointments', () => {
    it('debería obtener los turnos del usuario autenticado', async () => {
      const userId = 'user-123';

      const req = {
        user: {
          id: userId,
        },
      };

      const appointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' },
      ];

      appointmentsService.getAppointmentsByUserId.mockResolvedValue(
        appointments,
      );

      const result = await controller.getMyAppointments(req);

      expect(
        appointmentsService.getAppointmentsByUserId,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAppointmentsByUserId,
      ).toHaveBeenCalledWith(userId);

      expect(result).toBe(appointments);
    });
  });

  describe('getAvailableSlots', () => {
    it('debería obtener los horarios disponibles', async () => {
      const professionalId = 'professional-123';
      const serviceId = 'service-123';
      const date = '2026-10-02';

      const availableSlots = [
        '09:00',
        '10:00',
        '11:00',
      ];

      appointmentsService.getAvailableSlots.mockResolvedValue(
        availableSlots,
      );

      const result = await controller.getAvailableSlots(
        professionalId,
        serviceId,
        date,
      );

      expect(
        appointmentsService.getAvailableSlots,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAvailableSlots,
      ).toHaveBeenCalledWith(
        professionalId,
        serviceId,
        date,
        undefined,
      );

      expect(result).toBe(availableSlots);
    });

    it('debería pasar appointmentId cuando se proporciona', async () => {
      const professionalId = 'professional-123';
      const serviceId = 'service-123';
      const date = '2026-10-02';
      const appointmentId = 'appointment-123';

      const availableSlots = [
        '09:00',
        '10:00',
      ];

      appointmentsService.getAvailableSlots.mockResolvedValue(
        availableSlots,
      );

      const result = await controller.getAvailableSlots(
        professionalId,
        serviceId,
        date,
        appointmentId,
      );

      expect(
        appointmentsService.getAvailableSlots,
      ).toHaveBeenCalledWith(
        professionalId,
        serviceId,
        date,
        appointmentId,
      );

      expect(result).toBe(availableSlots);
    });
  });

  describe('getAppointmentById', () => {
    it('debería obtener un turno por su ID', async () => {
      const appointmentId = 'appointment-123';

      const appointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
      };

      appointmentsService.getAppointmentById.mockResolvedValue(
        appointment,
      );

      const result = await controller.getAppointmentById(appointmentId);

      expect(
        appointmentsService.getAppointmentById,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAppointmentById,
      ).toHaveBeenCalledWith(appointmentId);

      expect(result).toBe(appointment);
    });
  });

  describe('getAppointmentsByUserId', () => {
    it('debería obtener los turnos de un usuario', async () => {
      const userId = 'user-123';

      const appointments = [
        { id: 'appointment-1' },
      ];

      appointmentsService.getAppointmentsByUserId.mockResolvedValue(
        appointments,
      );

      const result = await controller.getAppointmentsByUserId(userId);

      expect(
        appointmentsService.getAppointmentsByUserId,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAppointmentsByUserId,
      ).toHaveBeenCalledWith(userId);

      expect(result).toBe(appointments);
    });
  });

  describe('getAppointmentsByProfessionalId', () => {
    it('debería obtener los turnos de un profesional', async () => {
      const professionalId = 'professional-123';

      const appointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' },
      ];

      appointmentsService.getAppointmentsByProfessionalId.mockResolvedValue(
        appointments,
      );

      const result =
        await controller.getAppointmentsByProfessionalId(
          professionalId,
        );

      expect(
        appointmentsService.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledWith(professionalId);

      expect(result).toBe(appointments);
    });
  });

  describe('cancelAppointment', () => {
    it('debería cancelar un turno', async () => {
      const appointmentId = 'appointment-123';

      const cancelledAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CANCELLED,
      };

      appointmentsService.cancelAppointment.mockResolvedValue(
        cancelledAppointment,
      );

      const result =
        await controller.cancelAppointment(appointmentId);

      expect(
        appointmentsService.cancelAppointment,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.cancelAppointment,
      ).toHaveBeenCalledWith(appointmentId);

      expect(result).toBe(cancelledAppointment);
    });
  });

  describe('rescheduleAppointment', () => {
    it('debería reprogramar un turno', async () => {
      const appointmentId = 'appointment-123';

      const rescheduleAppointmentDto =
        {
          startAt: '2026-10-02T10:00:00.000Z',
        } as unknown as RescheduleAppointmentDto;

      const updatedAppointment = {
        id: appointmentId,
        startAt: rescheduleAppointmentDto.startAt,
      };

      appointmentsService.rescheduleAppointment.mockResolvedValue(
        updatedAppointment,
      );

      const result = await controller.rescheduleAppointment(
        appointmentId,
        rescheduleAppointmentDto,
      );

      expect(
        appointmentsService.rescheduleAppointment,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.rescheduleAppointment,
      ).toHaveBeenCalledWith(
        appointmentId,
        rescheduleAppointmentDto,
      );

      expect(result).toBe(updatedAppointment);
    });
  });

  describe('completeAppointment', () => {
    it('debería completar un turno', async () => {
      const appointmentId = 'appointment-123';

      const completedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED,
      };

      appointmentsService.completeAppointment.mockResolvedValue(
        completedAppointment,
      );

      const result =
        await controller.completeAppointment(appointmentId);

      expect(
        appointmentsService.completeAppointment,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.completeAppointment,
      ).toHaveBeenCalledWith(appointmentId);

      expect(result).toBe(completedAppointment);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('debería actualizar el estado de un turno', async () => {
      const appointmentId = 'appointment-123';
      const newStatus = AppointmentStatus.CONFIRMED;

      const updatedAppointment = {
        id: appointmentId,
        status: newStatus,
      };

      appointmentsService.updateAppointmentStatus.mockResolvedValue(
        updatedAppointment,
      );

      const result = await controller.updateAppointmentStatus(
        appointmentId,
        newStatus,
      );

      expect(
        appointmentsService.updateAppointmentStatus,
      ).toHaveBeenCalledTimes(1);

      expect(
        appointmentsService.updateAppointmentStatus,
      ).toHaveBeenCalledWith(
        appointmentId,
        newStatus,
      );

      expect(result).toBe(updatedAppointment);
    });
  });
});
