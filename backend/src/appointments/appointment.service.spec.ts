import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentStatus } from './entities/appointment.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let repository: jest.Mocked<AppointmentsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: AppointmentsRepository,
          useValue: {
            getAllAppointments: jest.fn(),
            getAppointmentById: jest.fn(),
            getAppointmentsByUserId: jest.fn(),
            getAppointmentsByProfessionalId: jest.fn(),
            cancelAppointment: jest.fn(),
            rescheduleAppointment: jest.fn(),
            completeAppointment: jest.fn(),
            updateAppointmentStatus: jest.fn(),
            getAvailableSlots: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    repository = module.get<AppointmentsRepository>(
      AppointmentsRepository,
    ) as jest.Mocked<AppointmentsRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllAppointments', () => {
    it('debería obtener todos los turnos', async () => {
      const appointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' },
      ];

      repository.getAllAppointments.mockResolvedValue(appointments as any);

      const result = await service.getAllAppointments();

      expect(repository.getAllAppointments).toHaveBeenCalledTimes(1);
      expect(result).toEqual(appointments);
    });

    it('debería propagar el error del repository', async () => {
      const error = new Error('Error obteniendo turnos');

      repository.getAllAppointments.mockRejectedValue(error);

      await expect(service.getAllAppointments()).rejects.toThrow(
        'Error obteniendo turnos',
      );
    });
  });

  describe('getAppointmentById', () => {
    it('debería obtener un turno por ID', async () => {
      const appointment = {
        id: 'appointment-1',
      };

      repository.getAppointmentById.mockResolvedValue(appointment as any);

      const result = await service.getAppointmentById('appointment-1');

      expect(repository.getAppointmentById).toHaveBeenCalledTimes(1);
      expect(repository.getAppointmentById).toHaveBeenCalledWith(
        'appointment-1',
      );
      expect(result).toEqual(appointment);
    });

    it('debería propagar el error del repository', async () => {
      repository.getAppointmentById.mockRejectedValue(
        new Error('Turno no encontrado'),
      );

      await expect(
        service.getAppointmentById('appointment-1'),
      ).rejects.toThrow('Turno no encontrado');
    });
  });

  describe('getAppointmentsByUserId', () => {
    it('debería obtener los turnos de un usuario', async () => {
      const appointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' },
      ];

      repository.getAppointmentsByUserId.mockResolvedValue(appointments as any);

      const result =
        await service.getAppointmentsByUserId('user-123');

      expect(repository.getAppointmentsByUserId).toHaveBeenCalledTimes(1);
      expect(repository.getAppointmentsByUserId).toHaveBeenCalledWith(
        'user-123',
      );
      expect(result).toEqual(appointments);
    });
  });

  describe('getAppointmentsByProfessionalId', () => {
    it('debería obtener los turnos de un profesional', async () => {
      const appointments = [{ id: 'appointment-1' }];

      repository.getAppointmentsByProfessionalId.mockResolvedValue(
        appointments as any,
      );

      const result =
        await service.getAppointmentsByProfessionalId('professional-123');

      expect(
        repository.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledTimes(1);

      expect(
        repository.getAppointmentsByProfessionalId,
      ).toHaveBeenCalledWith('professional-123');

      expect(result).toEqual(appointments);
    });
  });

  describe('cancelAppointment', () => {
    it('debería cancelar un turno', async () => {
      const response = 'El turno ha sido cancelado exitosamente';

      repository.cancelAppointment.mockResolvedValue(response);

      const result = await service.cancelAppointment('appointment-123');

      expect(repository.cancelAppointment).toHaveBeenCalledTimes(1);
      expect(repository.cancelAppointment).toHaveBeenCalledWith(
        'appointment-123',
      );
      expect(result).toBe(response);
    });
  });

  describe('rescheduleAppointment', () => {
    it('debería reprogramar un turno', async () => {
      const dto = {
        startAt: '2026-10-10T15:00:00.000Z',
      } as any;

      const appointment = {
        id: 'appointment-123',
      };

      repository.rescheduleAppointment.mockResolvedValue(
        appointment as any,
      );

      const result = await service.rescheduleAppointment(
        'appointment-123',
        dto,
      );

      expect(repository.rescheduleAppointment).toHaveBeenCalledTimes(1);

      expect(repository.rescheduleAppointment).toHaveBeenCalledWith(
        'appointment-123',
        dto,
      );

      expect(result).toEqual(appointment);
    });
  });

  describe('completeAppointment', () => {
    it('debería completar un turno', async () => {
      const appointment = {
        id: 'appointment-123',
        status: AppointmentStatus.COMPLETED,
      };

      repository.completeAppointment.mockResolvedValue(
        appointment as any,
      );

      const result =
        await service.completeAppointment('appointment-123');

      expect(repository.completeAppointment).toHaveBeenCalledTimes(1);
      expect(repository.completeAppointment).toHaveBeenCalledWith(
        'appointment-123',
      );
      expect(result).toEqual(appointment);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('debería actualizar el estado de un turno', async () => {
      const appointment = {
        id: 'appointment-123',
        status: AppointmentStatus.CONFIRMED,
      };

      repository.updateAppointmentStatus.mockResolvedValue(
        appointment as any,
      );

      const result = await service.updateAppointmentStatus(
        'appointment-123',
        AppointmentStatus.CONFIRMED,
      );

      expect(repository.updateAppointmentStatus).toHaveBeenCalledTimes(1);

      expect(repository.updateAppointmentStatus).toHaveBeenCalledWith(
        'appointment-123',
        AppointmentStatus.CONFIRMED,
      );

      expect(result).toEqual(appointment);
    });
  });

  describe('getAvailableSlots', () => {
    it('debería obtener los horarios disponibles', async () => {
      const slots = {
        date: '2026-10-10',
        slots: ['09:00', '09:30', '10:00'],
      };

      repository.getAvailableSlots.mockResolvedValue(slots);

      const result = await service.getAvailableSlots(
        'professional-123',
        'service-123',
        '2026-10-10',
      );

      expect(repository.getAvailableSlots).toHaveBeenCalledTimes(1);

      expect(repository.getAvailableSlots).toHaveBeenCalledWith(
        'professional-123',
        'service-123',
        '2026-10-10',
        undefined,
      );

      expect(result).toEqual(slots);
    });

    it('debería pasar el appointmentId cuando se proporciona', async () => {
      const slots = {
        date: '2026-10-10',
        slots: ['09:00', '09:30'],
      };

      repository.getAvailableSlots.mockResolvedValue(slots);

      const result = await service.getAvailableSlots(
        'professional-123',
        'service-123',
        '2026-10-10',
        'appointment-123',
      );

      expect(repository.getAvailableSlots).toHaveBeenCalledTimes(1);

      expect(repository.getAvailableSlots).toHaveBeenCalledWith(
        'professional-123',
        'service-123',
        '2026-10-10',
        'appointment-123',
      );

      expect(result).toEqual(slots);
    });
  });
});
