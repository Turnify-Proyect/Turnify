import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';

import {
Appointment,
AppointmentStatus,
} from '../appointments/entities/appointment.entity';

import {
PaymentStatus,
PaymentType,
} from '../payments/entities/payment.entity';

import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
let service: StatisticsService;

let appointmentsRepositoryMock: {
find: jest.Mock;
};

beforeEach(() => {
jest.clearAllMocks();

appointmentsRepositoryMock = {
  find: jest.fn(),
};

service = new StatisticsService(
  appointmentsRepositoryMock as unknown as Repository<Appointment>,
);

});

describe('getAdminStatistics', () => {
it('should return statistics for the default current month range', async () => {
appointmentsRepositoryMock.find.mockResolvedValue([]);

  const result = await service.getAdminStatistics();

  expect(
    appointmentsRepositoryMock.find,
  ).toHaveBeenCalledTimes(1);

  expect(result).toEqual(
    expect.objectContaining({
      summary: {
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        cancellationRate: 0,
        depositRevenue: 0,
        completedServicesRevenue: 0,
        totalRevenue: 0,
      },
      appointmentsByStatus: {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
      },
      topServices: [],
      topProfessionals: [],
    }),
  );

  expect(
    result.appointmentsEvolution.length,
  ).toBeGreaterThan(0);

  expect(
    result.demandByWeekday,
  ).toHaveLength(7);
});

it('should use the provided date range', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '04/09/2026',
  );

  expect(result.period).toEqual({
    from: '01/09/2026',
    to: '04/09/2026',
  });

  expect(
    result.appointmentsEvolution,
  ).toEqual([
    {
      date: '2026-09-01',
      count: 0,
    },
    {
      date: '2026-09-02',
      count: 0,
    },
    {
      date: '2026-09-03',
      count: 0,
    },
    {
      date: '2026-09-04',
      count: 0,
    },
  ]);
});

it('should calculate appointment status statistics', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.PENDING,
      startAt: new Date('2026-09-01T12:00:00-03:00'),
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-02T12:00:00-03:00'),
    },
    {
      status: AppointmentStatus.COMPLETED,
      startAt: new Date('2026-09-03T12:00:00-03:00'),
    },
    {
      status: AppointmentStatus.CANCELLED,
      startAt: new Date('2026-09-04T12:00:00-03:00'),
    },
    {
      status: AppointmentStatus.EXPIRED,
      startAt: new Date('2026-09-04T15:00:00-03:00'),
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '04/09/2026',
  );

  expect(result.summary).toEqual(
    expect.objectContaining({
      totalAppointments: 5,
      completedAppointments: 1,
      cancelledAppointments: 1,
      cancellationRate: 20,
    }),
  );

  expect(
    result.appointmentsByStatus,
  ).toEqual({
    pending: 1,
    confirmed: 1,
    completed: 1,
    cancelled: 1,
    expired: 1,
  });
});

it('should calculate cancellation rate as zero when there are no appointments', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '04/09/2026',
  );

  expect(
    result.summary.cancellationRate,
  ).toBe(0);
});

it('should calculate appointments evolution by day', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T15:00:00-03:00'),
    },
    {
      status: AppointmentStatus.COMPLETED,
      startAt: new Date('2026-09-03T12:00:00-03:00'),
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '03/09/2026',
  );

  expect(
    result.appointmentsEvolution,
  ).toEqual([
    {
      date: '2026-09-01',
      count: 2,
    },
    {
      date: '2026-09-02',
      count: 0,
    },
    {
      date: '2026-09-03',
      count: 1,
    },
  ]);
});

it('should return top services ordered by number of appointments', async () => {
  const service1 = {
    id: 'service-1',
    name: 'Masajes',
    price: '1000',
  };

  const service2 = {
    id: 'service-2',
    name: 'Manicuría',
    price: '2000',
  };

  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
      service: service1,
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T11:00:00-03:00'),
      service: service1,
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T12:00:00-03:00'),
      service: service2,
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(result.topServices).toEqual([
    {
      serviceId: 'service-1',
      name: 'Masajes',
      appointments: 2,
    },
    {
      serviceId: 'service-2',
      name: 'Manicuría',
      appointments: 1,
    },
  ]);
});

it('should return top professionals ordered by number of appointments', async () => {
  const professional1 = {
    id: 'professional-1',
    user: {
      name: 'Juan',
    },
  };

  const professional2 = {
    id: 'professional-2',
    user: {
      name: 'María',
    },
  };

  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
      professional: professional1,
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T11:00:00-03:00'),
      professional: professional1,
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T12:00:00-03:00'),
      professional: professional2,
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(result.topProfessionals).toEqual([
    {
      professionalId: 'professional-1',
      name: 'Juan',
      appointments: 2,
    },
    {
      professionalId: 'professional-2',
      name: 'María',
      appointments: 1,
    },
  ]);
});

it('should calculate demand by weekday', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-07T10:00:00-03:00'),
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-07T15:00:00-03:00'),
    },
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-08T10:00:00-03:00'),
    },
  ]);

  const result = await service.getAdminStatistics(
    '07/09/2026',
    '08/09/2026',
  );

  expect(result.demandByWeekday).toEqual([
    {
      weekday: 'monday',
      label: 'Lunes',
      appointments: 2,
    },
    {
      weekday: 'tuesday',
      label: 'Martes',
      appointments: 1,
    },
    {
      weekday: 'wednesday',
      label: 'Miércoles',
      appointments: 0,
    },
    {
      weekday: 'thursday',
      label: 'Jueves',
      appointments: 0,
    },
    {
      weekday: 'friday',
      label: 'Viernes',
      appointments: 0,
    },
    {
      weekday: 'saturday',
      label: 'Sábado',
      appointments: 0,
    },
    {
      weekday: 'sunday',
      label: 'Domingo',
      appointments: 0,
    },
  ]);
});

});

describe('date validation', () => {
it('should reject invalid date format', async () => {
appointmentsRepositoryMock.find.mockResolvedValue([]);

  await expect(
    service.getAdminStatistics(
      '2026-09-01',
      '04/09/2026',
    ),
  ).rejects.toThrow(
    new BadRequestException(
      'Las fechas deben tener formato DD/MM/AAAA',
    ),
  );
});

it('should reject impossible dates', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([]);

  await expect(
    service.getAdminStatistics(
      '31/02/2026',
      '04/03/2026',
    ),
  ).rejects.toThrow(
    new BadRequestException(
      'La fecha ingresada no es válida',
    ),
  );
});

it('should reject when from is after to', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([]);

  await expect(
    service.getAdminStatistics(
      '10/09/2026',
      '01/09/2026',
    ),
  ).rejects.toThrow(
    new BadRequestException(
      'La fecha desde no puede ser posterior a la fecha hasta',
    ),
  );
});

});

describe('revenue', () => {
it('should calculate completed service revenue', async () => {
appointmentsRepositoryMock.find.mockResolvedValue([
{
status: AppointmentStatus.COMPLETED,
startAt: new Date('2026-09-01T10:00:00-03:00'),
service: {
id: 'service-1',
name: 'Masajes',
price: '2500',
},
orderDetail: {
total_price: '2500',
appointments: [
{
service: {
price: '2500',
},
},
],
order: {
payment: {
status: PaymentStatus.PAID,
amount: '2500',
},
},
},
},
]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(
    result.summary.completedServicesRevenue,
  ).toBe(2500);

  expect(
    result.summary.depositRevenue,
  ).toBe(0);

  expect(
    result.summary.totalRevenue,
  ).toBe(2500);
});

it('should calculate deposit revenue for a confirmed appointment with a paid payment', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
      service: {
        id: 'service-1',
        name: 'Masajes',
        price: '1000',
      },
      orderDetail: {
        total_price: '1000',
        appointments: [
          {
            service: {
              price: '1000',
            },
          },
        ],
        order: {
          payment: {
            status: PaymentStatus.PAID,
            amount: '300',
          },
        },
      },
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(
    result.summary.depositRevenue,
  ).toBe(300);

  expect(
    result.summary.completedServicesRevenue,
  ).toBe(0);

  expect(
    result.summary.totalRevenue,
  ).toBe(300);
});

it('should not count an unpaid deposit as revenue', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
      service: {
        id: 'service-1',
        name: 'Masajes',
        price: '1000',
      },
      orderDetail: {
        total_price: '1000',
        appointments: [
          {
            service: {
              price: '1000',
            },
          },
        ],
        order: {
          payment: {
            status: PaymentStatus.PENDING,
            amount: '300',
          },
        },
      },
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(
    result.summary.depositRevenue,
  ).toBe(0);

  expect(
    result.summary.totalRevenue,
  ).toBe(0);
});

it('should count the paid deposit of a cancelled appointment', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.CANCELLED,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
      service: {
        id: 'service-1',
        name: 'Masajes',
        price: '1000',
      },
      orderDetail: {
        total_price: '1000',
        appointments: [
          {
            service: {
              price: '1000',
            },
          },
        ],
        order: {
          payment: {
            status: PaymentStatus.PAID,
            amount: '300',
          },
        },
      },
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(
    result.summary.depositRevenue,
  ).toBe(300);

  expect(
    result.summary.totalRevenue,
  ).toBe(300);
});

it('should not count a paid deposit for a pending appointment', async () => {
  appointmentsRepositoryMock.find.mockResolvedValue([
    {
      status: AppointmentStatus.PENDING,
      startAt: new Date('2026-09-01T10:00:00-03:00'),
      service: {
        id: 'service-1',
        name: 'Masajes',
        price: '1000',
      },
      orderDetail: {
        total_price: '1000',
        appointments: [
          {
            service: {
              price: '1000',
            },
          },
        ],
        order: {
          payment: {
            status: PaymentStatus.PAID,
            amount: '300',
          },
        },
      },
    },
  ]);

  const result = await service.getAdminStatistics(
    '01/09/2026',
    '01/09/2026',
  );

  expect(
    result.summary.depositRevenue,
  ).toBe(0);
});

});

describe('repository query', () => {
it('should query appointments using the calculated date range', async () => {
appointmentsRepositoryMock.find.mockResolvedValue([]);

  await service.getAdminStatistics(
    '01/09/2026',
    '04/09/2026',
  );

  expect(
    appointmentsRepositoryMock.find,
  ).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        startAt: expect.anything(),
      },
      relations: {
        service: true,
        professional: {
          user: true,
        },
        orderDetail: {
          order: {
            payment: true,
          },
          appointments: {
            service: true,
          },
        },
      },
      order: {
        startAt: 'ASC',
      },
    }),
  );
});

});
});