import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { AppointmentsRepository } from './appointments.repository';
import { AppointmentStatus } from './entities/appointment.entity';
import { UserRole } from '../common/userRoles.enum';
import { DayOfWeek } from '../availability/entities/availability.entity';

describe('AppointmentsRepository', () => {
  let repository: AppointmentsRepository;

  let appointmentsRepository: any;
  let usersRepository: any;
  let professionalsRepository: any;
  let servicesRepository: any;
  let professionalServicesRepository: any;
  let availabilityRepository: any;

  let queryBuilder: any;

  beforeEach(() => {
    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    };

    appointmentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    usersRepository = {
      findOne: jest.fn(),
    };

    professionalsRepository = {
      findOne: jest.fn(),
    };

    servicesRepository = {
      findOne: jest.fn(),
    };

    professionalServicesRepository = {
      findOne: jest.fn(),
    };

    availabilityRepository = {
      getByProfessionalAndDay: jest.fn(),
    };

    repository = new AppointmentsRepository(
      appointmentsRepository,
      usersRepository,
      professionalsRepository,
      servicesRepository,
      professionalServicesRepository,
      availabilityRepository,
    );

    jest.clearAllMocks();

    // Evitamos que cada test tenga que verificar el cron interno
    // de expiración de turnos.
    jest
      .spyOn(repository as any, 'expirePendingAppointments')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const createProfessional = (overrides = {}) => ({
    id: 'professional-1',
    isActive: true,
    ...overrides,
  });

  const createService = (overrides = {}) => ({
    id: 'service-1',
    isActive: true,
    durationMinutes: 60,
    ...overrides,
  });

  const createUser = (overrides = {}) => ({
    id: 'user-1',
    roles: [UserRole.CLIENT],
    ...overrides,
  });

  const createAppointment = (overrides = {}) => ({
    id: 'appointment-1',
    status: AppointmentStatus.CONFIRMED,
    startAt: new Date('2030-10-02T15:00:00.000Z'),
    endAt: new Date('2030-10-02T16:00:00.000Z'),
    expiresAt: null,
    rescheduleCount: 0,
    user: createUser(),
    professional: createProfessional(),
    service: createService(),
    ...overrides,
  });

  const configureValidProfessionalService = () => {
    professionalServicesRepository.findOne.mockResolvedValue({
      professionalId: 'professional-1',
      serviceId: 'service-1',
    });
  };

  const configureValidAvailability = () => {
    availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
      {
        startTime: '09:00',
        endTime: '18:00',
      },
    ]);
  };

  const configureValidAppointmentDependencies = () => {
    usersRepository.findOne.mockResolvedValue(createUser());

    professionalsRepository.findOne.mockResolvedValue(
      createProfessional(),
    );

    servicesRepository.findOne.mockResolvedValue(
      createService(),
    );

    configureValidProfessionalService();

    configureValidAvailability();

    queryBuilder.getOne.mockResolvedValue(null);
  };

  // ===========================================================================
  // getAvailableSlots
  // ===========================================================================

  describe('getAvailableSlots', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2030-10-01T12:00:00.000Z'));

      professionalsRepository.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepository.findOne.mockResolvedValue(
        createService({
          durationMinutes: 60,
        }),
      );

      configureValidProfessionalService();

      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          startTime: '09:00',
          endTime: '12:00',
        },
      ]);

      queryBuilder.getMany.mockResolvedValue([]);
    });

    it('debería devolver los slots disponibles', async () => {
      const result = await repository.getAvailableSlots(
        'professional-1',
        'service-1',
        '2030-10-02',
      );

      expect(result.date).toBe('2030-10-02');

      expect(result.slots).toEqual([
        '09:00',
        '09:30',
        '10:00',
        '10:30',
        '11:00',
      ]);
    });

    it('debería lanzar NotFoundException si el profesional no existe', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getAvailableSlots(
          'professional-1',
          'service-1',
          '2030-10-02',
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'No existe el profesional seleccionado',
        ),
      );

      expect(servicesRepository.findOne).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el profesional está inactivo', async () => {
      professionalsRepository.findOne.mockResolvedValue(
        createProfessional({
          isActive: false,
        }),
      );

      await expect(
        repository.getAvailableSlots(
          'professional-1',
          'service-1',
          '2030-10-02',
        ),
      ).rejects.toThrow(
        'El profesional seleccionado se encuentra inactivo',
      );
    });

    it('debería lanzar NotFoundException si el servicio no existe', async () => {
      servicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getAvailableSlots(
          'professional-1',
          'service-1',
          '2030-10-02',
        ),
      ).rejects.toThrow(
        'No existe el servicio seleccionado',
      );
    });

    it('debería lanzar ConflictException si el servicio está inactivo', async () => {
      servicesRepository.findOne.mockResolvedValue(
        createService({
          isActive: false,
        }),
      );

      await expect(
        repository.getAvailableSlots(
          'professional-1',
          'service-1',
          '2030-10-02',
        ),
      ).rejects.toThrow(
        'El servicio seleccionado se encuentra inactivo',
      );
    });

    it('debería lanzar ConflictException si el profesional no realiza el servicio', async () => {
      professionalServicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getAvailableSlots(
          'professional-1',
          'service-1',
          '2030-10-02',
        ),
      ).rejects.toThrow(
        'El profesional seleccionado no realiza este servicio',
      );
    });

    it('debería devolver slots vacíos si el profesional no tiene disponibilidad ese día', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);

      const result = await repository.getAvailableSlots(
        'professional-1',
        'service-1',
        '2030-10-02',
      );

      expect(result).toEqual({
        date: '2030-10-02',
        slots: [],
      });
    });

it('debería excluir slots que se superponen con turnos existentes', async () => {
  queryBuilder.getMany.mockResolvedValue([
    {
      startAt: new Date('2030-10-02T12:00:00-03:00'),
      endAt: new Date('2030-10-02T13:00:00-03:00'),
    },
  ]);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    {
      startTime: '09:00',
      endTime: '14:00',
    },
  ]);

  const result = await repository.getAvailableSlots(
    'professional-1',
    'service-1',
    '2030-10-02',
  );

  expect(result.slots).not.toContain('12:00');
});


    it('debería excluir el turno indicado por appointmentIdToIgnore', async () => {
      const result = await repository.getAvailableSlots(
        'professional-1',
        'service-1',
        '2030-10-02',
        'appointment-to-ignore',
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'appointment.appointment_id != :appointmentIdToIgnore',
        {
          appointmentIdToIgnore: 'appointment-to-ignore',
        },
      );

      expect(result.slots.length).toBeGreaterThan(0);
    });

    it('debería generar slots respetando la duración del servicio', async () => {
      servicesRepository.findOne.mockResolvedValue(
        createService({
          durationMinutes: 90,
        }),
      );

      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          startTime: '09:00',
          endTime: '12:00',
        },
      ]);

      const result = await repository.getAvailableSlots(
        'professional-1',
        'service-1',
        '2030-10-02',
      );

      expect(result.slots).toEqual([
        '09:00',
        '09:30',
        '10:00',
        '10:30',
      ]);
    });

    it('debería consultar la disponibilidad usando el día de la semana correcto', async () => {
      await repository.getAvailableSlots(
        'professional-1',
        'service-1',
        '2030-10-02',
      );

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).toHaveBeenCalledWith(
        'professional-1',
        expect.anything(),
      );
    });

    it('debería consultar los turnos ocupados del profesional', async () => {
      await repository.getAvailableSlots(
        'professional-1',
        'service-1',
        '2030-10-02',
      );

      expect(
        appointmentsRepository.createQueryBuilder,
      ).toHaveBeenCalledWith('appointment');

      expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // prepareAppointment
  // ===========================================================================

  describe('prepareAppointment', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2030-10-01T12:00:00.000Z'));

      configureValidAppointmentDependencies();
    });

    const createDto = (overrides = {}) =>
      ({
        userId: 'user-1',
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: '2030-10-02T15:00:00.000Z',
        ...overrides,
      }) as any;

    it('debería preparar correctamente un turno válido', async () => {
      const dto = createDto();

      const result = await repository.prepareAppointment(dto);

      expect(result.user).toEqual(
        expect.objectContaining({
          id: 'user-1',
        }),
      );

      expect(result.professional).toEqual(
        expect.objectContaining({
          id: 'professional-1',
        }),
      );

      expect(result.service).toEqual(
        expect.objectContaining({
          id: 'service-1',
        }),
      );

      expect(result.startAt).toEqual(
        new Date('2030-10-02T15:00:00.000Z'),
      );

      expect(result.endAt).toEqual(
        new Date('2030-10-02T16:00:00.000Z'),
      );

      expect(result.expiresAt).toEqual(
        new Date('2030-10-01T12:10:00.000Z'),
      );
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'No existe un usuario con el ID proporcionado',
      );
    });

    it('debería lanzar ConflictException si el usuario no tiene rol CLIENT', async () => {
      usersRepository.findOne.mockResolvedValue(
        createUser({
          roles: [UserRole.ADMIN],
        }),
      );

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'Solo los usuarios con rol de cliente pueden realizar reservas',
      );
    });

    it('debería lanzar NotFoundException si el profesional no existe', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'No existe un profesional con el ID proporcionado',
      );
    });

    it('debería lanzar ConflictException si el profesional está inactivo', async () => {
      professionalsRepository.findOne.mockResolvedValue(
        createProfessional({
          isActive: false,
        }),
      );

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'El profesional seleccionado se encuentra inactivo',
      );
    });

    it('debería lanzar NotFoundException si el servicio no existe', async () => {
      servicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'No existe un servicio con el ID proporcionado',
      );
    });

    it('debería lanzar ConflictException si el servicio está inactivo', async () => {
      servicesRepository.findOne.mockResolvedValue(
        createService({
          isActive: false,
        }),
      );

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'El servicio seleccionado se encuentra inactivo',
      );
    });

    it('debería lanzar ConflictException si el profesional no realiza el servicio', async () => {
      professionalServicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'El profesional seleccionado no realiza este servicio',
      );
    });

    it('debería lanzar ConflictException si la fecha es inválida', async () => {
      await expect(
        repository.prepareAppointment(
          createDto({
            startAt: 'fecha-invalida',
          }),
        ),
      ).rejects.toThrow(
        'La fecha y hora del turno no son válidas',
      );
    });

    it('debería lanzar ConflictException si la fecha ya pasó', async () => {
      await expect(
        repository.prepareAppointment(
          createDto({
            startAt: '2030-09-30T15:00:00.000Z',
          }),
        ),
      ).rejects.toThrow(
        'No se puede reservar un turno en una fecha u horario pasado',
      );
    });

    it('debería validar la disponibilidad del profesional', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          startTime: '09:00',
          endTime: '12:00',
        },
      ]);

      await expect(
        repository.prepareAppointment(
          createDto({
            startAt: '2030-10-02T15:00:00.000Z',
          }),
        ),
      ).rejects.toThrow(
        'El profesional no se encuentra disponible en el horario seleccionado',
      );
    });

    it('debería lanzar ConflictException si el profesional tiene un turno superpuesto', async () => {
      queryBuilder.getOne.mockResolvedValue(
        createAppointment(),
      );

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'El profesional ya tiene un turno asignado en ese horario',
      );
    });

    it('debería lanzar ConflictException si el usuario tiene un turno superpuesto', async () => {
      // Primera consulta: profesional sin overlap.
      // Segunda consulta: usuario con overlap.
      queryBuilder.getOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createAppointment());

      await expect(
        repository.prepareAppointment(createDto()),
      ).rejects.toThrow(
        'El usuario ya tiene un turno asignado en ese horario',
      );

      expect(queryBuilder.getOne).toHaveBeenCalledTimes(2);
    });

    it('debería consultar disponibilidad antes de validar solapamientos', async () => {
      await repository.prepareAppointment(createDto());

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).toHaveBeenCalled();

      expect(
        appointmentsRepository.createQueryBuilder,
      ).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getAllAppointments
  // ===========================================================================

  describe('getAllAppointments', () => {
    it('debería devolver todos los turnos ordenados por fecha', async () => {
      const appointments = [
        createAppointment({ id: '1' }),
        createAppointment({ id: '2' }),
      ];

      appointmentsRepository.find.mockResolvedValue(appointments);

      const result = await repository.getAllAppointments();

      expect(result).toBe(appointments);

      expect(appointmentsRepository.find).toHaveBeenCalledWith({
        relations: {
          user: true,
          professional: {
            user: true,
          },
          service: true,
          orderDetail: {
            order: {
              payment: true,
            },
          },
        },
        order: {
          startAt: 'ASC',
        },
      });
    });
  });

  // ===========================================================================
  // getAppointmentById
  // ===========================================================================

  describe('getAppointmentById', () => {
    it('debería devolver el turno solicitado', async () => {
      const appointment = createAppointment();

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      const result = await repository.getAppointmentById(
        appointment.id,
      );

      expect(result).toBe(appointment);

      expect(appointmentsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: appointment.id,
        },
        relations: {
          user: true,
          professional: {
            user: true,
          },
          service: true,
          orderDetail: {
            order: {
              payment: true,
            },
          },
        },
      });
    });

    it('debería lanzar NotFoundException si no existe el turno', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getAppointmentById('appointment-1'),
      ).rejects.toThrow(
        'No existe un turno con el ID proporcionado',
      );
    });
  });

  // ===========================================================================
  // getAppointmentsByUserId
  // ===========================================================================

  describe('getAppointmentsByUserId', () => {
    it('debería devolver los turnos del usuario', async () => {
      const user = createUser();

      const appointments = [
        createAppointment({
          user,
        }),
      ];

      usersRepository.findOne.mockResolvedValue(user);
      appointmentsRepository.find.mockResolvedValue(
        appointments,
      );

      const result =
        await repository.getAppointmentsByUserId(user.id);

      expect(result).toBe(appointments);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: user.id,
        },
      });

      expect(appointmentsRepository.find).toHaveBeenCalledWith({
        where: {
          user: {
            id: user.id,
          },
        },
        relations: {
          professional: {
            user: true,
          },
          service: true,
          orderDetail: {
            order: {
              payment: true,
            },
          },
        },
        order: {
          startAt: 'ASC',
        },
      });
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getAppointmentsByUserId('user-1'),
      ).rejects.toThrow(
        'No existe un usuario con el ID proporcionado',
      );

      expect(appointmentsRepository.find).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getAppointmentsByProfessionalId
  // ===========================================================================

  describe('getAppointmentsByProfessionalId', () => {
    it('debería devolver los turnos del profesional', async () => {
      const professional = createProfessional();

      const appointments = [
        createAppointment({
          professional,
        }),
      ];

      professionalsRepository.findOne.mockResolvedValue(
        professional,
      );

      appointmentsRepository.find.mockResolvedValue(
        appointments,
      );

      const result =
        await repository.getAppointmentsByProfessionalId(
          professional.id,
        );

      expect(result).toBe(appointments);

      expect(
        professionalsRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: professional.id,
        },
      });

      expect(appointmentsRepository.find).toHaveBeenCalledWith({
        where: {
          professional: {
            id: professional.id,
          },
        },
        relations: {
          professional: {
            user: true,
          },
          service: true,
          orderDetail: {
            order: {
              payment: true,
            },
          },
        },
        order: {
          startAt: 'ASC',
        },
      });
    });

    it('debería lanzar NotFoundException si el profesional no existe', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getAppointmentsByProfessionalId(
          'professional-1',
        ),
      ).rejects.toThrow(
        'No existe un profesional con el ID proporcionado',
      );
    });
  });

  // ===========================================================================
  // cancelAppointment
  // ===========================================================================

  describe('cancelAppointment', () => {
    it('debería cancelar un turno confirmado', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
        expiresAt: new Date(),
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      const result =
        await repository.cancelAppointment(appointment.id);

      expect(appointment.status).toBe(
        AppointmentStatus.CANCELLED,
      );

      expect(appointment.expiresAt).toBeNull();

      expect(appointmentsRepository.save).toHaveBeenCalledWith(
        appointment,
      );

      expect(result).toBe(
        'El turno ha sido cancelado exitosamente',
      );
    });

    it('debería lanzar NotFoundException si el turno no existe', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.cancelAppointment('appointment-1'),
      ).rejects.toThrow(
        'No existe un turno con el ID proporcionado',
      );

      expect(appointmentsRepository.save).not.toHaveBeenCalled();
    });

    it('no debería cancelar un turno ya cancelado', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.CANCELLED,
        }),
      );

      await expect(
        repository.cancelAppointment('appointment-1'),
      ).rejects.toThrow(
        'El turno ya se encuentra cancelado',
      );

      expect(appointmentsRepository.save).not.toHaveBeenCalled();
    });

    it('no debería cancelar un turno completado', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.COMPLETED,
        }),
      );

      await expect(
        repository.cancelAppointment('appointment-1'),
      ).rejects.toThrow(
        'No se puede cancelar un turno completado',
      );
    });

    it('no debería cancelar un turno expirado', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.EXPIRED,
        }),
      );

      await expect(
        repository.cancelAppointment('appointment-1'),
      ).rejects.toThrow(
        'No se puede cancelar un turno expirado',
      );
    });
  });

  // ===========================================================================
  // rescheduleAppointment
  // ===========================================================================

  describe('rescheduleAppointment', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2030-10-01T12:00:00.000Z'));

      professionalsRepository.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepository.findOne.mockResolvedValue(
        createService({
          durationMinutes: 60,
        }),
      );

      configureValidProfessionalService();

      configureValidAvailability();

      queryBuilder.getOne.mockResolvedValue(null);

      appointmentsRepository.save.mockImplementation(
        async (appointment) => appointment,
      );
    });

    it('debería reprogramar correctamente un turno confirmado', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
        startAt: new Date('2030-10-05T15:00:00.000Z'),
        rescheduleCount: 0,
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      const dto = {
        startAt: '2030-10-06T15:00:00.000Z',
      } as any;

      const result =
        await repository.rescheduleAppointment(
          appointment.id,
          dto,
        );

      expect(result.startAt).toEqual(
        new Date('2030-10-06T15:00:00.000Z'),
      );

      expect(result.endAt).toEqual(
        new Date('2030-10-06T16:00:00.000Z'),
      );

      expect(result.rescheduleCount).toBe(1);

      expect(appointmentsRepository.save).toHaveBeenCalledWith(
        appointment,
      );
    });

    it('debería rechazar un DTO vacío', async () => {
      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {} as any,
        ),
      ).rejects.toThrow(
        'Debe indicar al menos un dato para reprogramar el turno',
      );
    });

    it('debería rechazar un turno inexistente', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-06T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'El turno no existe o no se encuentra en un estado válido para reprogramar',
      );
    });

    it('debería rechazar un turno que alcanzó el máximo de reprogramaciones', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          rescheduleCount: 2,
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-06T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'El turno alcanzó el máximo de reprogramaciones permitidas',
      );
    });

    it('debería rechazar la reprogramación si faltan menos de 24 horas', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-02T10:00:00.000Z'),
        }),
      );

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-03T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'No se puede reprogramar un turno con menos de 24 horas de anticipación',
      );
    });

    it('debería rechazar un profesional inexistente', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-06T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'No existe un profesional con el ID proporcionado',
      );
    });

    it('debería rechazar un profesional inactivo', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      professionalsRepository.findOne.mockResolvedValue(
        createProfessional({
          isActive: false,
        }),
      );

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-06T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'El profesional seleccionado se encuentra inactivo',
      );
    });

    it('debería rechazar un servicio inexistente', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      servicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-06T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'No existe un servicio con el ID proporcionado',
      );
    });

    it('debería rechazar un servicio inactivo', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      servicesRepository.findOne.mockResolvedValue(
        createService({
          isActive: false,
        }),
      );

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-10-06T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'El servicio seleccionado se encuentra inactivo',
      );
    });

    it('debería rechazar una fecha nueva inválida', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: 'fecha-invalida',
          } as any,
        ),
      ).rejects.toThrow(
        'La nueva fecha y hora del turno no son válidas',
      );
    });

    it('debería rechazar una nueva fecha pasada', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          startAt: new Date('2030-10-05T15:00:00.000Z'),
        }),
      );

      await expect(
        repository.rescheduleAppointment(
          'appointment-1',
          {
            startAt: '2030-09-30T15:00:00.000Z',
          } as any,
        ),
      ).rejects.toThrow(
        'No se puede reprogramar un turno a una fecha u horario pasado',
      );
    });

    it('debería incrementar rescheduleCount', async () => {
      const appointment = createAppointment({
        startAt: new Date('2030-10-05T15:00:00.000Z'),
        rescheduleCount: 1,
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      await repository.rescheduleAppointment(
        appointment.id,
        {
          startAt: '2030-10-06T15:00:00.000Z',
        } as any,
      );

      expect(appointment.rescheduleCount).toBe(2);
    });

    it('debería reiniciar expiresAt si el turno estaba pendiente', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
        startAt: new Date('2030-10-05T15:00:00.000Z'),
        expiresAt: new Date('2030-10-05T15:10:00.000Z'),
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      await repository.rescheduleAppointment(
        appointment.id,
        {
          startAt: '2030-10-06T15:00:00.000Z',
        } as any,
      );

      expect(appointment.expiresAt).toEqual(
        new Date('2030-10-01T12:10:00.000Z'),
      );
    });

    it('no debería reiniciar expiresAt si el turno estaba confirmado', async () => {
      const expiresAt = new Date('2030-10-05T15:10:00.000Z');

      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
        startAt: new Date('2030-10-05T15:00:00.000Z'),
        expiresAt,
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      await repository.rescheduleAppointment(
        appointment.id,
        {
          startAt: '2030-10-06T15:00:00.000Z',
        } as any,
      );

      expect(appointment.expiresAt).toBe(expiresAt);
    });
  });

  // ===========================================================================
  // completeAppointment
  // ===========================================================================

  describe('completeAppointment', () => {
    it('debería completar un turno confirmado que ya comenzó', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2030-10-02T16:00:00.000Z'));

      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
        startAt: new Date('2030-10-02T15:00:00.000Z'),
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      const result =
        await repository.completeAppointment(appointment.id);

      expect(appointment.status).toBe(
        AppointmentStatus.COMPLETED,
      );

      expect(appointmentsRepository.save).toHaveBeenCalledWith(
        appointment,
      );

      expect(result).toBe(appointment);
    });

    it('debería lanzar NotFoundException si el turno no existe', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.completeAppointment('appointment-1'),
      ).rejects.toThrow(
        'No existe un turno con el ID proporcionado',
      );
    });

    it('no debería completar un turno que no está confirmado', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.PENDING,
        }),
      );

      await expect(
        repository.completeAppointment('appointment-1'),
      ).rejects.toThrow(
        'Solo se pueden completar turnos confirmados',
      );
    });

    it('no debería completar un turno que todavía no comenzó', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2030-10-02T12:00:00.000Z'));

      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.CONFIRMED,
          startAt: new Date('2030-10-02T15:00:00.000Z'),
        }),
      );

      await expect(
        repository.completeAppointment('appointment-1'),
      ).rejects.toThrow(
        'No se puede completar un turno que todavía no comenzó',
      );
    });
  });

  // ===========================================================================
  // updateAppointmentStatus
  // ===========================================================================

  describe('updateAppointmentStatus', () => {
    it('debería pasar de PENDING a CONFIRMED', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
        expiresAt: new Date('2030-10-01T12:10:00.000Z'),
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      const result =
        await repository.updateAppointmentStatus(
          appointment.id,
          AppointmentStatus.CONFIRMED,
        );

      expect(result.status).toBe(
        AppointmentStatus.CONFIRMED,
      );

      expect(result.expiresAt).toBeNull();

      expect(appointmentsRepository.save).toHaveBeenCalledWith(
        appointment,
      );
    });

    it('debería permitir pasar de PENDING a CANCELLED', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      await repository.updateAppointmentStatus(
        appointment.id,
        AppointmentStatus.CANCELLED,
      );

      expect(appointment.status).toBe(
        AppointmentStatus.CANCELLED,
      );
    });

    it('debería permitir pasar de CONFIRMED a COMPLETED', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      await repository.updateAppointmentStatus(
        appointment.id,
        AppointmentStatus.COMPLETED,
      );

      expect(appointment.status).toBe(
        AppointmentStatus.COMPLETED,
      );
    });

    it('debería permitir pasar de CONFIRMED a CANCELLED', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.CONFIRMED,
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      await repository.updateAppointmentStatus(
        appointment.id,
        AppointmentStatus.CANCELLED,
      );

      expect(appointment.status).toBe(
        AppointmentStatus.CANCELLED,
      );
    });

    it('debería lanzar NotFoundException si el turno no existe', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.updateAppointmentStatus(
          'appointment-1',
          AppointmentStatus.CONFIRMED,
        ),
      ).rejects.toThrow(
        'No existe un turno con el ID proporcionado',
      );
    });

    it('no debería permitir pasar de PENDING a COMPLETED', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.PENDING,
        }),
      );

      await expect(
        repository.updateAppointmentStatus(
          'appointment-1',
          AppointmentStatus.COMPLETED,
        ),
      ).rejects.toThrow(
        'No se puede cambiar el estado del turno',
      );

      expect(appointmentsRepository.save).not.toHaveBeenCalled();
    });

    it('no debería permitir pasar de CONFIRMED a PENDING', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.CONFIRMED,
        }),
      );

      await expect(
        repository.updateAppointmentStatus(
          'appointment-1',
          AppointmentStatus.PENDING,
        ),
      ).rejects.toThrow(
        'No se puede cambiar el estado del turno',
      );
    });

    it('no debería permitir cambiar un turno CANCELLED', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.CANCELLED,
        }),
      );

      await expect(
        repository.updateAppointmentStatus(
          'appointment-1',
          AppointmentStatus.CONFIRMED,
        ),
      ).rejects.toThrow(
        'No se puede cambiar el estado del turno',
      );
    });

    it('no debería permitir cambiar un turno COMPLETED', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.COMPLETED,
        }),
      );

      await expect(
        repository.updateAppointmentStatus(
          'appointment-1',
          AppointmentStatus.CONFIRMED,
        ),
      ).rejects.toThrow(
        'No se puede cambiar el estado del turno',
      );
    });

    it('no debería permitir cambiar un turno EXPIRED', async () => {
      appointmentsRepository.findOne.mockResolvedValue(
        createAppointment({
          status: AppointmentStatus.EXPIRED,
        }),
      );

      await expect(
        repository.updateAppointmentStatus(
          'appointment-1',
          AppointmentStatus.CONFIRMED,
        ),
      ).rejects.toThrow(
        'No se puede cambiar el estado del turno',
      );
    });

    it('debería eliminar expiresAt al pasar a un estado distinto de PENDING', async () => {
      const appointment = createAppointment({
        status: AppointmentStatus.PENDING,
        expiresAt: new Date('2030-10-01T12:10:00.000Z'),
      });

      appointmentsRepository.findOne.mockResolvedValue(
        appointment,
      );

      appointmentsRepository.save.mockResolvedValue(
        appointment,
      );

      await repository.updateAppointmentStatus(
        appointment.id,
        AppointmentStatus.CONFIRMED,
      );

      expect(appointment.expiresAt).toBeNull();
    });
  });
});
