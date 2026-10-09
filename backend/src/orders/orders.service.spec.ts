import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { OrdersService } from './orders.service';
import { AppointmentsRepository } from '../appointments/appointments.repository';

import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';
import { OrderStatus } from './enums/order-status.enum';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockAppointmentsRepository = {
    prepareAppointment: jest.fn(),
  };

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDataSource.transaction.mockImplementation(
      async (callback) => callback(mockManager),
    );

    /*
     * Simulamos el comportamiento de TypeORM:
     *
     * manager.create(Entity, object)
     *   -> devuelve el objeto creado
     *
     * manager.create(Entity, array)
     *   -> devuelve un array de objetos creados
     */
    mockManager.create.mockImplementation(
      (_entity, data) => {
        if (Array.isArray(data)) {
          return data.map((item) => ({
            ...item,
          }));
        }

        return {
          ...data,
        };
      },
    );

    /*
     * El save mock devuelve los mismos objetos que recibe.
     * Esto permite verificar correctamente expiresAt, status, etc.
     *
     * Para Order necesitamos simular order_id y status.
     */
    mockManager.save.mockImplementation(
      async (entity, data) => {
        if (entity === Order) {
          return {
            ...data,
            order_id: 'order-1',
            status: OrderStatus.PENDING,
          };
        }

        if (entity === OrderDetail) {
          return {
            ...data,
            total_price: data.total_price,
          };
        }

        if (entity === Appointment) {
          if (Array.isArray(data)) {
            return data.map((appointment, index) => ({
              ...appointment,
              id: `appointment-${index + 1}`,
            }));
          }

          return {
            ...data,
            id: 'appointment-1',
          };
        }

        return data;
      },
    );

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          OrdersService,
          {
            provide: DataSource,
            useValue: mockDataSource,
          },
          {
            provide: AppointmentsRepository,
            useValue: mockAppointmentsRepository,
          },
        ],
      }).compile();

    service =
      module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    const userId =
      '550e8400-e29b-41d4-a716-446655440000';

    const createPreparedAppointment = (
      overrides = {},
    ) => ({
      user: {
        id: userId,
      },
      professional: {
        id: 'professional-1',
      },
      service: {
        id: 'service-1',
        price: 100,
      },
      startAt: new Date(
        '2026-01-15T10:00:00.000Z',
      ),
      endAt: new Date(
        '2026-01-15T11:00:00.000Z',
      ),
      ...overrides,
    });

    it('should prepare all appointments using the authenticated user id', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
          {
            serviceId: 'service-2',
            professionalId: 'professional-2',
            startAt:
              '2026-01-15T11:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-1',
              price: 100,
            },
          }),
        )
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-2',
              price: 200,
            },
            startAt: new Date(
              '2026-01-15T11:00:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T12:00:00.000Z',
            ),
          }),
        );

      await service.create(userId, dto);

      expect(
        mockAppointmentsRepository.prepareAppointment,
      ).toHaveBeenCalledTimes(2);

      expect(
        mockAppointmentsRepository.prepareAppointment,
      ).toHaveBeenNthCalledWith(1, {
        userId,
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt:
          '2026-01-15T10:00:00.000Z',
      });

      expect(
        mockAppointmentsRepository.prepareAppointment,
      ).toHaveBeenNthCalledWith(2, {
        userId,
        professionalId: 'professional-2',
        serviceId: 'service-2',
        startAt:
          '2026-01-15T11:00:00.000Z',
      });
    });

    it('should calculate the total price using database service prices', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
          {
            serviceId: 'service-2',
            professionalId: 'professional-2',
            startAt:
              '2026-01-15T11:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-1',
              price: 150,
            },
          }),
        )
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-2',
              price: 250,
            },
            startAt: new Date(
              '2026-01-15T11:00:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T12:00:00.000Z',
            ),
          }),
        );

      const result = await service.create(
        userId,
        dto,
      );

      expect(result.totalPrice).toBe(400);

      expect(
        mockManager.create,
      ).toHaveBeenCalledWith(
        OrderDetail,
        expect.objectContaining({
          total_price: 400,
        }),
      );
    });

    it('should create the order with PENDING status', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        createPreparedAppointment(),
      );

      await service.create(userId, dto);

      expect(
        mockManager.create,
      ).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          user: expect.anything(),
          status: OrderStatus.PENDING,
        }),
      );

      expect(
        mockManager.save,
      ).toHaveBeenCalledWith(
        Order,
        expect.anything(),
      );
    });

    it('should create one OrderDetail with the calculated total price', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
          {
            serviceId: 'service-2',
            professionalId: 'professional-2',
            startAt:
              '2026-01-15T11:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-1',
              price: 100,
            },
          }),
        )
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-2',
              price: 200,
            },
            startAt: new Date(
              '2026-01-15T11:00:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T12:00:00.000Z',
            ),
          }),
        );

      await service.create(userId, dto);

      expect(
        mockManager.create,
      ).toHaveBeenCalledWith(
        OrderDetail,
        expect.objectContaining({
          total_price: 300,
        }),
      );

      expect(
        mockManager.save,
      ).toHaveBeenCalledWith(
        OrderDetail,
        expect.anything(),
      );
    });

    it('should create appointments with PENDING status', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      const prepared =
        createPreparedAppointment();

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        prepared,
      );

      await service.create(userId, dto);

      expect(
        mockManager.create,
      ).toHaveBeenCalledWith(
        Appointment,
        expect.objectContaining({
          user: prepared.user,
          professional:
            prepared.professional,
          service: prepared.service,
          startAt: prepared.startAt,
          endAt: prepared.endAt,
          status: AppointmentStatus.PENDING,
          expiresAt: expect.any(Date),
        }),
      );
    });

it('should use the same expiration date for all appointments', async () => {
  const dto = {
    appointments: [
      {
        serviceId: 'service-1',
        professionalId: 'professional-1',
        startAt: '2026-01-15T10:00:00.000Z',
      },
      {
        serviceId: 'service-2',
        professionalId: 'professional-2',
        startAt: '2026-01-15T11:00:00.000Z',
      },
    ],
  } as any;

  mockAppointmentsRepository.prepareAppointment
    .mockResolvedValueOnce(
      createPreparedAppointment({
        service: {
          id: 'service-1',
          price: 100,
        },
      }),
    )
    .mockResolvedValueOnce(
      createPreparedAppointment({
        service: {
          id: 'service-2',
          price: 200,
        },
        startAt: new Date(
          '2026-01-15T11:00:00.000Z',
        ),
        endAt: new Date(
          '2026-01-15T12:00:00.000Z',
        ),
      }),
    );

  await service.create(userId, dto);

  /*
   * OrdersService llama manager.create(Appointment, ...)
   * una vez por cada appointment.
   */
  const appointmentCalls =
    mockManager.create.mock.calls.filter(
      ([entity]) => entity === Appointment,
    );

  expect(appointmentCalls).toHaveLength(2);

  const firstAppointment =
    appointmentCalls[0][1];

  const secondAppointment =
    appointmentCalls[1][1];

  expect(
    firstAppointment.expiresAt,
  ).toBeInstanceOf(Date);

  expect(
    secondAppointment.expiresAt,
  ).toBeInstanceOf(Date);

  /*
   * Ambos appointments deben compartir exactamente
   * la misma instancia de Date porque el service calcula
   * expiresAt una sola vez antes del map().
   */
  expect(
    firstAppointment.expiresAt,
  ).toBe(secondAppointment.expiresAt);
});


    it('should reject overlapping appointments inside the same order', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
          {
            serviceId: 'service-2',
            professionalId: 'professional-2',
            startAt:
              '2026-01-15T10:30:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment
        .mockResolvedValueOnce(
          createPreparedAppointment({
            startAt: new Date(
              '2026-01-15T10:00:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T11:00:00.000Z',
            ),
          }),
        )
        .mockResolvedValueOnce(
          createPreparedAppointment({
            startAt: new Date(
              '2026-01-15T10:30:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T11:30:00.000Z',
            ),
          }),
        );

      await expect(
        service.create(userId, dto),
      ).rejects.toThrow(
        new ConflictException(
          'La orden contiene turnos con horarios superpuestos',
        ),
      );

      expect(
        mockDataSource.transaction,
      ).not.toHaveBeenCalled();
    });

    it('should allow appointments that touch but do not overlap', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
          {
            serviceId: 'service-2',
            professionalId: 'professional-2',
            startAt:
              '2026-01-15T11:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-1',
              price: 100,
            },
            startAt: new Date(
              '2026-01-15T10:00:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T11:00:00.000Z',
            ),
          }),
        )
        .mockResolvedValueOnce(
          createPreparedAppointment({
            service: {
              id: 'service-2',
              price: 200,
            },
            startAt: new Date(
              '2026-01-15T11:00:00.000Z',
            ),
            endAt: new Date(
              '2026-01-15T12:00:00.000Z',
            ),
          }),
        );

      await expect(
        service.create(userId, dto),
      ).resolves.toBeDefined();

      expect(
        mockDataSource.transaction,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject a non-positive total price', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        createPreparedAppointment({
          service: {
            id: 'service-1',
            price: 0,
          },
        }),
      );

      await expect(
        service.create(userId, dto),
      ).rejects.toThrow(
        new ConflictException(
          'No se pudo calcular un precio válido para la orden',
        ),
      );

      expect(
        mockDataSource.transaction,
      ).not.toHaveBeenCalled();
    });

    it('should reject an invalid total price', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        createPreparedAppointment({
          service: {
            id: 'service-1',
            price: 'invalid',
          },
        }),
      );

      await expect(
        service.create(userId, dto),
      ).rejects.toThrow(
        new ConflictException(
          'No se pudo calcular un precio válido para la orden',
        ),
      );

      expect(
        mockDataSource.transaction,
      ).not.toHaveBeenCalled();
    });

    it('should execute order creation inside a transaction', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        createPreparedAppointment(),
      );

      await service.create(userId, dto);

      expect(
        mockDataSource.transaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockDataSource.transaction,
      ).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should return the created order information', async () => {
      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      const startAt = new Date(
        '2026-01-15T10:00:00.000Z',
      );

      const endAt = new Date(
        '2026-01-15T11:00:00.000Z',
      );

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        createPreparedAppointment({
          startAt,
          endAt,
        }),
      );

      const result = await service.create(
        userId,
        dto,
      );

      expect(result.orderId).toBe('order-1');

      expect(result.status).toBe(
        OrderStatus.PENDING,
      );

      expect(result.totalPrice).toBe(100);

      expect(
        result.appointments,
      ).toHaveLength(1);

      expect(
        result.appointments[0],
      ).toEqual(
        expect.objectContaining({
          id: 'appointment-1',
          status: AppointmentStatus.PENDING,
          startAt,
          endAt,
          expiresAt: expect.any(Date),
        }),
      );

      expect(
        result.appointments[0].expiresAt,
      ).toBeInstanceOf(Date);
    });

    it('should propagate errors from prepareAppointment', async () => {
      const error =
        new ConflictException(
          'Appointment unavailable',
        );

      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment.mockRejectedValue(
        error,
      );

      await expect(
        service.create(userId, dto),
      ).rejects.toThrow(error);

      expect(
        mockDataSource.transaction,
      ).not.toHaveBeenCalled();
    });

    it('should propagate transaction errors', async () => {
      const error = new Error(
        'Database transaction failed',
      );

      const dto = {
        appointments: [
          {
            serviceId: 'service-1',
            professionalId: 'professional-1',
            startAt:
              '2026-01-15T10:00:00.000Z',
          },
        ],
      } as any;

      mockAppointmentsRepository.prepareAppointment.mockResolvedValue(
        createPreparedAppointment(),
      );

      mockDataSource.transaction.mockRejectedValue(
        error,
      );

      await expect(
        service.create(userId, dto),
      ).rejects.toThrow(error);
    });
  });
});
