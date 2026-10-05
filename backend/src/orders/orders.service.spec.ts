import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { OrdersService } from './orders.service';
import { AppointmentsRepository } from '../appointments/appointments.repository';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { OrderStatus } from './enums/order-status.enum';

describe('OrdersService', () => {
let service: OrdersService;

const appointmentsRepository = {
prepareAppointment: jest.fn(),
};

const dataSource = {
transaction: jest.fn(),
};

beforeEach(async () => {
jest.clearAllMocks();

const module: TestingModule = await Test.createTestingModule({
  providers: [
    OrdersService,
    {
      provide: DataSource,
      useValue: dataSource,
    },
    {
      provide: AppointmentsRepository,
      useValue: appointmentsRepository,
    },
  ],
}).compile();

service = module.get<OrdersService>(OrdersService);


});

describe('create', () => {
it('should create an order with its appointments', async () => {
const user = {
id: 'user-1',
};

  const professional = {
    id: 'professional-1',
  };

  const serviceEntity = {
    id: 'service-1',
    price: 5000,
  };

  const preparedAppointment = {
    user,
    professional,
    service: serviceEntity,
    startAt: new Date('2026-10-02T10:00:00'),
    endAt: new Date('2026-10-02T11:00:00'),
  };

  appointmentsRepository.prepareAppointment.mockResolvedValue(
    preparedAppointment,
  );

  const createOrderDto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: new Date('2026-10-02T10:00:00'),
      },
    ],
  } as any;

  const savedOrder = {
    order_id: 'order-1',
    status: OrderStatus.PENDING,
  };

  const savedOrderDetail = {
    id: 'order-detail-1',
  };

  const savedAppointment = {
    id: 'appointment-1',
    status: AppointmentStatus.PENDING,
    startAt: preparedAppointment.startAt,
    endAt: preparedAppointment.endAt,
    expiresAt: expect.any(Date),
  };

  const manager = {
    create: jest.fn()
      .mockImplementationOnce((_entity, data) => data)
      .mockImplementationOnce((_entity, data) => data)
      .mockImplementationOnce((_entity, data) => data),

    save: jest.fn()
      .mockResolvedValueOnce(savedOrder)
      .mockResolvedValueOnce(savedOrderDetail)
      .mockResolvedValueOnce([savedAppointment]),
  };

  dataSource.transaction.mockImplementation(async (callback) => {
    return callback(manager);
  });

  const result = await service.create('user-1', createOrderDto);

  expect(
    appointmentsRepository.prepareAppointment,
  ).toHaveBeenCalledWith({
    userId: 'user-1',
    professionalId: 'professional-1',
    serviceId: 'service-1',
    startAt: createOrderDto.appointments[0].startAt,
  });

  expect(dataSource.transaction).toHaveBeenCalled();

  expect(manager.create).toHaveBeenCalledWith(Order, {
    user,
    status: OrderStatus.PENDING,
  });

  expect(manager.create).toHaveBeenCalledWith(OrderDetail, {
    order: savedOrder,
    total_price: 5000,
  });

  expect(manager.create).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({
      user,
      professional,
      service: serviceEntity,
      orderDetail: savedOrderDetail,
      status: AppointmentStatus.PENDING,
    }),
  );

  expect(result.orderId).toBe('order-1');
  expect(result.status).toBe(OrderStatus.PENDING);
  expect(result.totalPrice).toBe(5000);
  expect(result.appointments).toHaveLength(1);
  expect(result.appointments[0].id).toBe('appointment-1');
});

it('should calculate the total price using all services', async () => {
  const user = {
    id: 'user-1',
  };

  const appointment1 = {
    user,
    professional: { id: 'professional-1' },
    service: {
      id: 'service-1',
      price: 5000,
    },
    startAt: new Date('2026-10-02T10:00:00'),
    endAt: new Date('2026-10-02T11:00:00'),
  };

  const appointment2 = {
    user,
    professional: { id: 'professional-2' },
    service: {
      id: 'service-2',
      price: 3000,
    },
    startAt: new Date('2026-10-02T12:00:00'),
    endAt: new Date('2026-10-02T13:00:00'),
  };

  appointmentsRepository.prepareAppointment
    .mockResolvedValueOnce(appointment1)
    .mockResolvedValueOnce(appointment2);

  const manager = {
    create: jest.fn((_, data) => data),
    save: jest.fn()
      .mockResolvedValueOnce({
        order_id: 'order-1',
        status: OrderStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'detail-1',
      })
      .mockResolvedValueOnce([
        {
          id: 'appointment-1',
          status: AppointmentStatus.PENDING,
          startAt: appointment1.startAt,
          endAt: appointment1.endAt,
          expiresAt: new Date(),
        },
        {
          id: 'appointment-2',
          status: AppointmentStatus.PENDING,
          startAt: appointment2.startAt,
          endAt: appointment2.endAt,
          expiresAt: new Date(),
        },
      ]),
  };

  dataSource.transaction.mockImplementation(async (callback) => {
    return callback(manager);
  });

  const dto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: appointment1.startAt,
      },
      {
        professionalId: 'professional-2',
        serviceId: 'service-2',
        startAt: appointment2.startAt,
      },
    ],
  } as any;

  const result = await service.create('user-1', dto);

  expect(result.totalPrice).toBe(8000);
});

it('should throw ConflictException when total price is invalid', async () => {
  const preparedAppointment = {
    user: { id: 'user-1' },
    professional: { id: 'professional-1' },
    service: {
      id: 'service-1',
      price: 0,
    },
    startAt: new Date('2026-10-02T10:00:00'),
    endAt: new Date('2026-10-02T11:00:00'),
  };

  appointmentsRepository.prepareAppointment.mockResolvedValue(
    preparedAppointment,
  );

  const dto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: preparedAppointment.startAt,
      },
    ],
  } as any;

  await expect(
    service.create('user-1', dto),
  ).rejects.toThrow(
    new ConflictException(
      'No se pudo calcular un precio válido para la orden',
    ),
  );

  expect(dataSource.transaction).not.toHaveBeenCalled();
});

it('should throw ConflictException when appointments overlap internally', async () => {
  const firstAppointment = {
    user: { id: 'user-1' },
    professional: { id: 'professional-1' },
    service: {
      id: 'service-1',
      price: 5000,
    },
    startAt: new Date('2026-10-02T10:00:00'),
    endAt: new Date('2026-10-02T11:00:00'),
  };

  const secondAppointment = {
    user: { id: 'user-1' },
    professional: { id: 'professional-2' },
    service: {
      id: 'service-2',
      price: 3000,
    },
    startAt: new Date('2026-10-02T10:30:00'),
    endAt: new Date('2026-10-02T11:30:00'),
  };

  appointmentsRepository.prepareAppointment
    .mockResolvedValueOnce(firstAppointment)
    .mockResolvedValueOnce(secondAppointment);

  const dto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: firstAppointment.startAt,
      },
      {
        professionalId: 'professional-2',
        serviceId: 'service-2',
        startAt: secondAppointment.startAt,
      },
    ],
  } as any;

  await expect(
    service.create('user-1', dto),
  ).rejects.toThrow(
    new ConflictException(
      'La orden contiene turnos con horarios superpuestos',
    ),
  );

  expect(dataSource.transaction).not.toHaveBeenCalled();
});

it('should allow appointments that do not overlap', async () => {
  const firstAppointment = {
    user: { id: 'user-1' },
    professional: { id: 'professional-1' },
    service: {
      id: 'service-1',
      price: 5000,
    },
    startAt: new Date('2026-10-02T10:00:00'),
    endAt: new Date('2026-10-02T11:00:00'),
  };

  const secondAppointment = {
    user: { id: 'user-1' },
    professional: { id: 'professional-2' },
    service: {
      id: 'service-2',
      price: 3000,
    },
    startAt: new Date('2026-10-02T11:00:00'),
    endAt: new Date('2026-10-02T12:00:00'),
  };

  appointmentsRepository.prepareAppointment
    .mockResolvedValueOnce(firstAppointment)
    .mockResolvedValueOnce(secondAppointment);

  const manager = {
    create: jest.fn((_, data) => data),
    save: jest.fn()
      .mockResolvedValueOnce({
        order_id: 'order-1',
        status: OrderStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'detail-1',
      })
      .mockResolvedValueOnce([
        {
          id: 'appointment-1',
          status: AppointmentStatus.PENDING,
          startAt: firstAppointment.startAt,
          endAt: firstAppointment.endAt,
          expiresAt: new Date(),
        },
        {
          id: 'appointment-2',
          status: AppointmentStatus.PENDING,
          startAt: secondAppointment.startAt,
          endAt: secondAppointment.endAt,
          expiresAt: new Date(),
        },
      ]),
  };

  dataSource.transaction.mockImplementation(async (callback) => {
    return callback(manager);
  });

  const dto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: firstAppointment.startAt,
      },
      {
        professionalId: 'professional-2',
        serviceId: 'service-2',
        startAt: secondAppointment.startAt,
      },
    ],
  } as any;

  const result = await service.create('user-1', dto);

  expect(result.totalPrice).toBe(8000);
  expect(dataSource.transaction).toHaveBeenCalled();
});

it('should propagate prepareAppointment errors', async () => {
  const error = new ConflictException(
    'El profesional no está disponible',
  );

  appointmentsRepository.prepareAppointment.mockRejectedValue(error);

  const dto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: new Date('2026-10-02T10:00:00'),
      },
    ],
  } as any;

  await expect(
    service.create('user-1', dto),
  ).rejects.toThrow(
    'El profesional no está disponible',
  );

  expect(dataSource.transaction).not.toHaveBeenCalled();
});

it('should use the authenticated user id when preparing appointments', async () => {
  const preparedAppointment = {
    user: { id: 'user-1' },
    professional: { id: 'professional-1' },
    service: {
      id: 'service-1',
      price: 5000,
    },
    startAt: new Date('2026-10-02T10:00:00'),
    endAt: new Date('2026-10-02T11:00:00'),
  };

  appointmentsRepository.prepareAppointment.mockResolvedValue(
    preparedAppointment,
  );

  const manager = {
    create: jest.fn((_, data) => data),
    save: jest.fn()
      .mockResolvedValueOnce({
        order_id: 'order-1',
        status: OrderStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'detail-1',
      })
      .mockResolvedValueOnce([
        {
          id: 'appointment-1',
          status: AppointmentStatus.PENDING,
          startAt: preparedAppointment.startAt,
          endAt: preparedAppointment.endAt,
          expiresAt: new Date(),
        },
      ]),
  };

  dataSource.transaction.mockImplementation(async (callback) => {
    return callback(manager);
  });

  const dto = {
    appointments: [
      {
        professionalId: 'professional-1',
        serviceId: 'service-1',
        startAt: preparedAppointment.startAt,
      },
    ],
  } as any;

  await service.create('authenticated-user', dto);

  expect(
    appointmentsRepository.prepareAppointment,
  ).toHaveBeenCalledWith({
    userId: 'authenticated-user',
    professionalId: 'professional-1',
    serviceId: 'service-1',
    startAt: preparedAppointment.startAt,
  });
});


});
});