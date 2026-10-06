import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between } from 'typeorm';

import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';
import {
  PaymentStatus,
  PaymentType,
} from '../payments/entities/payment.entity';
import { StatisticsService } from './statistics.service';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

interface BuildOptions {
  id?: string;
  status?: AppointmentStatus;
  startAt?: Date;
  service?: any;
  professional?: any;
  orderDetail?: any;
}

let sequence = 0;

const defaultService = { id: 's1', name: 'Masaje', price: 1000 };

/**
 * Crea un turno con una orden de un solo turno por defecto
 * (total_price = 1000, sin pago).
 */
function buildAppointment(options: BuildOptions = {}): Appointment {
  sequence += 1;

  const service = options.service ?? defaultService;

  const appointment: any = {
    id: options.id ?? `a${sequence}`,
    status: options.status ?? AppointmentStatus.PENDING,
    startAt: options.startAt ?? new Date('2026-10-05T15:00:00-03:00'), // lunes
    service,
    professional: options.professional ?? {
      id: 'p1',
      user: { name: 'Ana' },
    },
  };

  appointment.orderDetail = options.orderDetail ?? {
    total_price: '1000',
    order: { payment: null },
    appointments: [{ service }],
  };

  return appointment as Appointment;
}

/**
 * Pago abonado. Sin paymentType se comporta como un pago antiguo,
 * que el service cuenta como seña.
 */
function paidPayment(amount: number, paymentType?: PaymentType) {
  return {
    status: PaymentStatus.PAID,
    amount: String(amount),
    paymentType,
  };
}

function unpaidPayment(amount: number) {
  return {
    status: 'NOT_PAID' as unknown as PaymentStatus,
    amount: String(amount),
  };
}

/** Orden de un solo turno con total_price y pago indicados. */
function singleOrder(
  totalPrice: number,
  payment: any,
  service: any = defaultService,
) {
  return {
    total_price: String(totalPrice),
    order: { payment },
    appointments: [{ service }],
  };
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe('StatisticsService', () => {
  let service: StatisticsService;
  let repository: { find: jest.Mock };

  const FROM = '01/10/2026';
  const TO = '31/10/2026';

  beforeEach(async () => {
    repository = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: getRepositoryToken(Appointment), useValue: repository },
      ],
    }).compile();

    service = module.get(StatisticsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // =========================
  // RANGO DE FECHAS
  // =========================

  describe('rango de fechas', () => {
    it('lanza BadRequestException si el formato no es DD/MM/AAAA', async () => {
      await expect(
        service.getAdminStatistics('2026-10-01', TO),
      ).rejects.toThrow(
        new BadRequestException('Las fechas deben tener formato DD/MM/AAAA'),
      );

      await expect(
        service.getAdminStatistics(FROM, '1/10/2026'),
      ).rejects.toThrow(BadRequestException);

      expect(repository.find).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la fecha no existe (31/02)', async () => {
      await expect(
        service.getAdminStatistics('31/02/2026', TO),
      ).rejects.toThrow(
        new BadRequestException('La fecha ingresada no es válida'),
      );
    });

    it('lanza BadRequestException si "desde" es posterior a "hasta"', async () => {
      await expect(
        service.getAdminStatistics('15/10/2026', '10/10/2026'),
      ).rejects.toThrow(
        new BadRequestException(
          'La fecha desde no puede ser posterior a la fecha hasta',
        ),
      );
    });

    it('usa por defecto el primer día del mes hasta hoy (hora Argentina)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-20T15:00:00-03:00'));

      const result = await service.getAdminStatistics();

      expect(result.period).toEqual({ from: '01/10/2026', to: '20/10/2026' });
    });

    it('trata strings vacíos como si no se hubieran enviado', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-20T15:00:00-03:00'));

      const result = await service.getAdminStatistics('   ', '');

      expect(result.period).toEqual({ from: '01/10/2026', to: '20/10/2026' });
    });

    it('consulta el repositorio con Between(inicio del día, fin del día) en UTC-3', async () => {
      await service.getAdminStatistics(FROM, TO);

      const args = repository.find.mock.calls[0][0];

      expect(args.where.startAt).toEqual(
        Between(
          new Date('2026-10-01T00:00:00-03:00'),
          new Date('2026-10-31T23:59:59.999-03:00'),
        ),
      );
      expect(args.order).toEqual({ startAt: 'ASC' });
    });

    it('devuelve el período tal como lo recibió', async () => {
      const result = await service.getAdminStatistics(FROM, TO);

      expect(result.period).toEqual({ from: FROM, to: TO });
    });
  });

  // =========================
  // RESUMEN
  // =========================

  describe('summary', () => {
    it('devuelve todo en cero cuando no hay turnos', async () => {
      const { summary } = await service.getAdminStatistics(FROM, TO);

      expect(summary).toEqual({
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        cancellationRate: 0,
        depositRevenue: 0,
        fullPaymentRevenue: 0,
        completionRevenue: 0,
        totalRevenue: 0,
      });
    });

    it('cuenta turnos totales, completados y cancelados', async () => {
      repository.find.mockResolvedValue([
        buildAppointment({ status: AppointmentStatus.COMPLETED }),
        buildAppointment({ status: AppointmentStatus.COMPLETED }),
        buildAppointment({ status: AppointmentStatus.CANCELLED }),
        buildAppointment({ status: AppointmentStatus.PENDING }),
      ]);

      const { summary } = await service.getAdminStatistics(FROM, TO);

      expect(summary.totalAppointments).toBe(4);
      expect(summary.completedAppointments).toBe(2);
      expect(summary.cancelledAppointments).toBe(1);
      expect(summary.cancellationRate).toBe(25);
    });

    it('redondea la tasa de cancelación a 2 decimales', async () => {
      repository.find.mockResolvedValue([
        buildAppointment({ status: AppointmentStatus.CANCELLED }),
        buildAppointment({ status: AppointmentStatus.PENDING }),
        buildAppointment({ status: AppointmentStatus.PENDING }),
      ]);

      const { summary } = await service.getAdminStatistics(FROM, TO);

      expect(summary.cancellationRate).toBe(33.33);
    });
  });

  // =========================
  // INGRESOS
  // =========================

  describe('ingresos', () => {
    describe('turnos completados (completionRevenue)', () => {
      it('sin pago previo: suma el total_price histórico de la orden', async () => {
        const serviceWithNewPrice = { id: 's1', name: 'Masaje', price: 5000 };

        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            // el precio actual del servicio cambió, pero se usa el histórico
            service: serviceWithNewPrice,
            orderDetail: singleOrder(1200, null, serviceWithNewPrice),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.completionRevenue).toBe(1200);
        expect(summary.depositRevenue).toBe(0);
        expect(summary.fullPaymentRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(1200);
      });

      it('con seña pagada: solo suma como completado lo que faltaba pagar', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            orderDetail: singleOrder(1000, paidPayment(300)),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(300);
        expect(summary.completionRevenue).toBe(700);
        expect(summary.fullPaymentRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(1000);
      });

      it('con pago completo por adelantado: no suma nada al completar', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            orderDetail: singleOrder(
              1000,
              paidPayment(1000, PaymentType.FULL_PAYMENT),
            ),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.fullPaymentRevenue).toBe(1000);
        expect(summary.completionRevenue).toBe(0);
        expect(summary.depositRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(1000);
      });

      it('nunca devuelve un saldo negativo si el pago supera el precio', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            orderDetail: singleOrder(1000, paidPayment(1200)),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.completionRevenue).toBe(0);
        expect(summary.depositRevenue).toBe(1200);
        expect(summary.totalRevenue).toBe(1200);
      });

      it('en una orden con varios turnos reparte el total proporcionalmente al precio actual', async () => {
        const serviceA = { id: 'sA', name: 'A', price: 100 };
        const serviceB = { id: 'sB', name: 'B', price: 300 };

        const orderDetail = {
          total_price: '1000',
          order: { payment: null },
          appointments: [{ service: serviceA }, { service: serviceB }],
        };

        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            service: serviceA,
            orderDetail,
          }),
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            service: serviceB,
            orderDetail,
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        // A: 1000 * 100/400 = 250  |  B: 1000 * 300/400 = 750
        expect(summary.completionRevenue).toBe(1000);
      });

      it('si no hay total_price usa el precio actual del servicio', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            service: { id: 's1', name: 'Masaje', price: 800 },
            orderDetail: {
              total_price: '0',
              order: { payment: null },
              appointments: [],
            },
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.completionRevenue).toBe(800);
      });

      it('si no hay orderDetail usa el precio actual del servicio', async () => {
        const appointment = buildAppointment({
          status: AppointmentStatus.COMPLETED,
          service: { id: 's1', name: 'Masaje', price: 650 },
        });
        (appointment as any).orderDetail = undefined;

        repository.find.mockResolvedValue([appointment]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.completionRevenue).toBe(650);
      });

      it('redondea los importes a 2 decimales', async () => {
        const serviceA = { id: 'sA', name: 'A', price: 100 };
        const serviceB = { id: 'sB', name: 'B', price: 200 };

        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            service: serviceA,
            orderDetail: {
              total_price: '100',
              order: { payment: null },
              appointments: [{ service: serviceA }, { service: serviceB }],
            },
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        // 100 * (100/300) = 33.333... -> 33.33
        expect(summary.completionRevenue).toBe(33.33);
      });
    });

    describe('pagos previos (depositRevenue y fullPaymentRevenue)', () => {
      it('turno CONFIRMED con pago PAID sin paymentType: lo cuenta como seña', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(1000, paidPayment(300)),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(300);
        expect(summary.fullPaymentRevenue).toBe(0);
        expect(summary.completionRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(300);
      });

      it('turno con pago PAID de tipo seña: lo cuenta como seña', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(
              1000,
              paidPayment(300, 'deposit_payment' as unknown as PaymentType),
            ),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(300);
        expect(summary.fullPaymentRevenue).toBe(0);
      });

      it('turno con pago PAID de tipo FULL_PAYMENT: lo cuenta como pago completo', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(
              1000,
              paidPayment(1000, PaymentType.FULL_PAYMENT),
            ),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.fullPaymentRevenue).toBe(1000);
        expect(summary.depositRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(1000);
      });

      it('turno CANCELLED con pago PAID: el pago igual se considera cobrado', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CANCELLED,
            orderDetail: singleOrder(1000, paidPayment(300)),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(300);
      });

      // Comportamiento actual: el pago PAID se cuenta sin mirar el estado del
      // turno. Antes PENDING y EXPIRED no sumaban. Si no es intencional,
      // revisar calculateRevenue() y actualizar este test.
      it.each([AppointmentStatus.PENDING, AppointmentStatus.EXPIRED])(
        'cuenta el pago PAID aunque el turno esté en estado %s',
        async (status) => {
          repository.find.mockResolvedValue([
            buildAppointment({
              status,
              orderDetail: singleOrder(1000, paidPayment(300)),
            }),
          ]);

          const { summary } = await service.getAdminStatistics(FROM, TO);

          expect(summary.depositRevenue).toBe(300);
          expect(summary.completionRevenue).toBe(0);
        },
      );

      it('no suma si el pago no está PAID', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(1000, unpaidPayment(300)),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(0);
      });

      it('no suma un pago REFUNDED (reembolsado)', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.EXPIRED,
            orderDetail: singleOrder(1000, {
              status: PaymentStatus.REFUNDED,
              amount: '300',
            }),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(0);
        expect(summary.totalRevenue).toBe(0);
      });

      it('no suma nada si no existe pago', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({ status: AppointmentStatus.CONFIRMED }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(0);
        expect(summary.fullPaymentRevenue).toBe(0);
      });

      it.each(['0', '-50', 'abc'])(
        'ignora pagos con monto inválido (%s)',
        async (amount) => {
          repository.find.mockResolvedValue([
            buildAppointment({
              status: AppointmentStatus.CONFIRMED,
              orderDetail: singleOrder(1000, {
                status: PaymentStatus.PAID,
                amount,
              }),
            }),
          ]);

          const { summary } = await service.getAdminStatistics(FROM, TO);

          expect(summary.depositRevenue).toBe(0);
        },
      );

      it('ignora el pago si el total de la orden es 0 o inválido', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(0, paidPayment(300)),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(0);
      });

      it('reparte el pago entre los turnos de la misma orden según su precio', async () => {
        const serviceA = { id: 'sA', name: 'A', price: 100 };
        const serviceB = { id: 'sB', name: 'B', price: 300 };

        const orderDetail = {
          total_price: '1000',
          order: { payment: paidPayment(500) },
          appointments: [{ service: serviceA }, { service: serviceB }],
        };

        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            service: serviceA,
            orderDetail,
          }),
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            service: serviceB,
            orderDetail,
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        // A: 500 * (250/1000) = 125  |  B: 500 * (750/1000) = 375
        expect(summary.depositRevenue).toBe(500);
      });

      it('si solo un turno de una orden múltiple entra en el rango, suma únicamente su parte', async () => {
        const serviceA = { id: 'sA', name: 'A', price: 100 };
        const serviceB = { id: 'sB', name: 'B', price: 300 };

        const orderDetail = {
          total_price: '1000',
          order: { payment: paidPayment(500) },
          appointments: [{ service: serviceA }, { service: serviceB }],
        };

        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            service: serviceA,
            orderDetail,
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(125);
      });
    });

    describe('totalRevenue', () => {
      it('combina señas, pagos completos y saldos de turnos completados', async () => {
        repository.find.mockResolvedValue([
          // Completado con seña: seña 500 + saldo 1500
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            orderDetail: singleOrder(2000, paidPayment(500)),
          }),
          // Confirmado con seña: 250
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(1000, paidPayment(250)),
          }),
          // Cancelado con seña: 100
          buildAppointment({
            status: AppointmentStatus.CANCELLED,
            orderDetail: singleOrder(1000, paidPayment(100)),
          }),
          // Confirmado con pago completo: 800
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(
              800,
              paidPayment(800, PaymentType.FULL_PAYMENT),
            ),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.depositRevenue).toBe(850);
        expect(summary.fullPaymentRevenue).toBe(800);
        expect(summary.completionRevenue).toBe(1500);
        expect(summary.totalRevenue).toBe(3150);
      });

      it('el total es la suma de los tres conceptos', async () => {
        repository.find.mockResolvedValue([
          buildAppointment({
            status: AppointmentStatus.COMPLETED,
            orderDetail: singleOrder(1000, paidPayment(300)),
          }),
          buildAppointment({
            status: AppointmentStatus.CONFIRMED,
            orderDetail: singleOrder(
              600,
              paidPayment(600, PaymentType.FULL_PAYMENT),
            ),
          }),
        ]);

        const { summary } = await service.getAdminStatistics(FROM, TO);

        expect(summary.totalRevenue).toBe(
          summary.depositRevenue +
            summary.fullPaymentRevenue +
            summary.completionRevenue,
        );
      });
    });
  });

  // =========================
  // TURNOS POR ESTADO
  // =========================

  describe('appointmentsByStatus', () => {
    it('devuelve el conteo por cada estado', async () => {
      repository.find.mockResolvedValue([
        buildAppointment({ status: AppointmentStatus.PENDING }),
        buildAppointment({ status: AppointmentStatus.PENDING }),
        buildAppointment({ status: AppointmentStatus.CONFIRMED }),
        buildAppointment({ status: AppointmentStatus.COMPLETED }),
        buildAppointment({ status: AppointmentStatus.COMPLETED }),
        buildAppointment({ status: AppointmentStatus.COMPLETED }),
        buildAppointment({ status: AppointmentStatus.CANCELLED }),
        buildAppointment({ status: AppointmentStatus.EXPIRED }),
      ]);

      const { appointmentsByStatus } = await service.getAdminStatistics(
        FROM,
        TO,
      );

      expect(appointmentsByStatus).toEqual({
        pending: 2,
        confirmed: 1,
        completed: 3,
        cancelled: 1,
        expired: 1,
      });
    });

    it('devuelve ceros cuando no hay turnos', async () => {
      const { appointmentsByStatus } = await service.getAdminStatistics(
        FROM,
        TO,
      );

      expect(appointmentsByStatus).toEqual({
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
      });
    });
  });

  // =========================
  // EVOLUCIÓN
  // =========================

  describe('appointmentsEvolution', () => {
    it('incluye todos los días del período con 0 cuando no hay turnos', async () => {
      const { appointmentsEvolution } = await service.getAdminStatistics(
        '01/10/2026',
        '05/10/2026',
      );

      expect(appointmentsEvolution).toEqual([
        { date: '2026-10-01', count: 0 },
        { date: '2026-10-02', count: 0 },
        { date: '2026-10-03', count: 0 },
        { date: '2026-10-04', count: 0 },
        { date: '2026-10-05', count: 0 },
      ]);
    });

    it('devuelve un único día si desde y hasta son iguales', async () => {
      const { appointmentsEvolution } = await service.getAdminStatistics(
        '05/10/2026',
        '05/10/2026',
      );

      expect(appointmentsEvolution).toEqual([{ date: '2026-10-05', count: 0 }]);
    });

    it('agrupa los turnos por día', async () => {
      repository.find.mockResolvedValue([
        buildAppointment({ startAt: new Date('2026-10-02T10:00:00-03:00') }),
        buildAppointment({ startAt: new Date('2026-10-02T16:00:00-03:00') }),
        buildAppointment({ startAt: new Date('2026-10-04T09:00:00-03:00') }),
      ]);

      const { appointmentsEvolution } = await service.getAdminStatistics(
        '01/10/2026',
        '05/10/2026',
      );

      expect(appointmentsEvolution).toEqual([
        { date: '2026-10-01', count: 0 },
        { date: '2026-10-02', count: 2 },
        { date: '2026-10-03', count: 0 },
        { date: '2026-10-04', count: 1 },
        { date: '2026-10-05', count: 0 },
      ]);
    });

    it('usa la zona horaria de Argentina para asignar el día', async () => {
      // 2026-10-03T01:30Z = 2026-10-02 22:30 en Argentina
      repository.find.mockResolvedValue([
        buildAppointment({ startAt: new Date('2026-10-03T01:30:00Z') }),
      ]);

      const { appointmentsEvolution } = await service.getAdminStatistics(
        '01/10/2026',
        '05/10/2026',
      );

      expect(
        appointmentsEvolution.find((d) => d.date === '2026-10-02')?.count,
      ).toBe(1);
      expect(
        appointmentsEvolution.find((d) => d.date === '2026-10-03')?.count,
      ).toBe(0);
    });

    it('cruza correctamente el cambio de mes', async () => {
      const { appointmentsEvolution } = await service.getAdminStatistics(
        '30/10/2026',
        '02/11/2026',
      );

      expect(appointmentsEvolution.map((d) => d.date)).toEqual([
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
      ]);
    });

    it('un mes completo devuelve la cantidad de días correcta', async () => {
      const { appointmentsEvolution } = await service.getAdminStatistics(
        FROM,
        TO,
      );

      expect(appointmentsEvolution).toHaveLength(31);
    });
  });

  // =========================
  // TOP SERVICIOS
  // =========================

  describe('topServices', () => {
    it('ordena por cantidad de turnos de forma descendente', async () => {
      const a = { id: 'sA', name: 'A', price: 100 };
      const b = { id: 'sB', name: 'B', price: 100 };

      repository.find.mockResolvedValue([
        buildAppointment({ service: a }),
        buildAppointment({ service: b }),
        buildAppointment({ service: b }),
        buildAppointment({ service: b }),
        buildAppointment({ service: a }),
      ]);

      const { topServices } = await service.getAdminStatistics(FROM, TO);

      expect(topServices).toEqual([
        { serviceId: 'sB', name: 'B', appointments: 3 },
        { serviceId: 'sA', name: 'A', appointments: 2 },
      ]);
    });

    it('limita el ranking a 5 servicios', async () => {
      const appointments = Array.from({ length: 7 }, (_, i) =>
        buildAppointment({
          service: { id: `s${i}`, name: `S${i}`, price: 100 },
        }),
      );
      repository.find.mockResolvedValue(appointments);

      const { topServices } = await service.getAdminStatistics(FROM, TO);

      expect(topServices).toHaveLength(5);
    });

    it('ignora turnos sin servicio', async () => {
      const appointment = buildAppointment();
      (appointment as any).service = null;
      repository.find.mockResolvedValue([appointment]);

      const { topServices } = await service.getAdminStatistics(FROM, TO);

      expect(topServices).toEqual([]);
    });
  });

  // =========================
  // TOP PROFESIONALES
  // =========================

  describe('topProfessionals', () => {
    it('ordena por cantidad de turnos de forma descendente', async () => {
      const ana = { id: 'p1', user: { name: 'Ana' } };
      const luis = { id: 'p2', user: { name: 'Luis' } };

      repository.find.mockResolvedValue([
        buildAppointment({ professional: ana }),
        buildAppointment({ professional: luis }),
        buildAppointment({ professional: luis }),
      ]);

      const { topProfessionals } = await service.getAdminStatistics(FROM, TO);

      expect(topProfessionals).toEqual([
        { professionalId: 'p2', name: 'Luis', appointments: 2 },
        { professionalId: 'p1', name: 'Ana', appointments: 1 },
      ]);
    });

    it('usa "Sin nombre" si el profesional no tiene usuario', async () => {
      repository.find.mockResolvedValue([
        buildAppointment({ professional: { id: 'p9', user: null } }),
      ]);

      const { topProfessionals } = await service.getAdminStatistics(FROM, TO);

      expect(topProfessionals[0].name).toBe('Sin nombre');
    });

    it('limita el ranking a 5 profesionales', async () => {
      const appointments = Array.from({ length: 7 }, (_, i) =>
        buildAppointment({
          professional: { id: `p${i}`, user: { name: `Pro ${i}` } },
        }),
      );
      repository.find.mockResolvedValue(appointments);

      const { topProfessionals } = await service.getAdminStatistics(FROM, TO);

      expect(topProfessionals).toHaveLength(5);
    });

    it('ignora turnos sin profesional', async () => {
      const appointment = buildAppointment();
      (appointment as any).professional = null;
      repository.find.mockResolvedValue([appointment]);

      const { topProfessionals } = await service.getAdminStatistics(FROM, TO);

      expect(topProfessionals).toEqual([]);
    });
  });

  // =========================
  // DEMANDA POR DÍA
  // =========================

  describe('demandByWeekday', () => {
    it('devuelve los 7 días en orden de lunes a domingo con labels en español', async () => {
      const { demandByWeekday } = await service.getAdminStatistics(FROM, TO);

      expect(demandByWeekday.map((d) => d.weekday)).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]);
      expect(demandByWeekday.map((d) => d.label)).toEqual([
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
        'Domingo',
      ]);
      expect(demandByWeekday.every((d) => d.appointments === 0)).toBe(true);
    });

    it('cuenta los turnos según el día de la semana', async () => {
      repository.find.mockResolvedValue([
        // lunes 05/10/2026
        buildAppointment({ startAt: new Date('2026-10-05T10:00:00-03:00') }),
        buildAppointment({ startAt: new Date('2026-10-05T11:00:00-03:00') }),
        // sábado 10/10/2026
        buildAppointment({ startAt: new Date('2026-10-10T10:00:00-03:00') }),
      ]);

      const { demandByWeekday } = await service.getAdminStatistics(FROM, TO);

      expect(
        demandByWeekday.find((d) => d.weekday === 'monday')?.appointments,
      ).toBe(2);
      expect(
        demandByWeekday.find((d) => d.weekday === 'saturday')?.appointments,
      ).toBe(1);
      expect(
        demandByWeekday.find((d) => d.weekday === 'sunday')?.appointments,
      ).toBe(0);
    });

    it('usa la zona horaria de Argentina para determinar el día', async () => {
      // 2026-10-06T01:00Z = lunes 05/10 22:00 en Argentina (en UTC sería martes)
      repository.find.mockResolvedValue([
        buildAppointment({ startAt: new Date('2026-10-06T01:00:00Z') }),
      ]);

      const { demandByWeekday } = await service.getAdminStatistics(FROM, TO);

      expect(
        demandByWeekday.find((d) => d.weekday === 'monday')?.appointments,
      ).toBe(1);
      expect(
        demandByWeekday.find((d) => d.weekday === 'tuesday')?.appointments,
      ).toBe(0);
    });
  });
});
