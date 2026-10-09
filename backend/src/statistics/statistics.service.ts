import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';

import {
  PaymentStatus,
  PaymentType,
} from '../payments/entities/payment.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  async getAdminStatistics(from?: string, to?: string) {
    const range = this.resolveDateRange(from, to);

    const appointments = await this.appointmentsRepository.find({
      where: {
        startAt: Between(range.startDate, range.endDate),
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
    });

    const totalAppointments = appointments.length;

    const completedAppointments = appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.COMPLETED,
    ).length;

    const cancelledAppointments = appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.CANCELLED,
    ).length;

    const cancellationRate =
      totalAppointments === 0
        ? 0
        : this.round((cancelledAppointments / totalAppointments) * 100);

    const revenue = this.calculateRevenue(appointments);

    return {
      period: {
        from: range.from,
        to: range.to,
      },

      summary: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        cancellationRate,

        depositRevenue: revenue.depositRevenue,

        completedServicesRevenue: revenue.completedServicesRevenue,

        totalRevenue: revenue.totalRevenue,
      },

      appointmentsByStatus: this.getAppointmentsByStatus(appointments),

      appointmentsEvolution: this.getAppointmentsEvolution(
        appointments,
        range.startDate,
        range.endDate,
      ),

      topServices: this.getTopServices(appointments),

      topProfessionals: this.getTopProfessionals(appointments),

      demandByWeekday: this.getDemandByWeekday(appointments),
    };
  }

  private calculateRevenue(appointments: Appointment[]) {
    let depositRevenue = 0;
    let completedServicesRevenue = 0;

    for (const appointment of appointments) {
      const appointmentPrice = this.getAppointmentBookedPrice(appointment);

      if (appointment.status === AppointmentStatus.COMPLETED) {
        completedServicesRevenue += appointmentPrice;

        continue;
      }

      const payment = appointment.orderDetail?.order?.payment;

      if (
        payment?.status === PaymentStatus.PAID &&
        (appointment.status === AppointmentStatus.CONFIRMED ||
          appointment.status === AppointmentStatus.CANCELLED)
      ) {
        depositRevenue += this.getAppointmentPaymentShare(appointment);
      }
    }

    depositRevenue = this.roundMoney(depositRevenue);

    completedServicesRevenue = this.roundMoney(completedServicesRevenue);

    return {
      depositRevenue,

      completedServicesRevenue,

      totalRevenue: this.roundMoney(depositRevenue + completedServicesRevenue),
    };
  }

  private getAppointmentBookedPrice(appointment: Appointment): number {
    const detail = appointment.orderDetail;

    const orderTotal = Number(detail?.total_price || 0);

    const currentServicePrice = Number(appointment.service?.price || 0);

    const orderAppointments = detail?.appointments || [];

    if (orderAppointments.length === 1 && orderTotal > 0) {
      return orderTotal;
    }

    const currentOrderTotal = orderAppointments.reduce(
      (total, item) => total + Number(item.service?.price || 0),
      0,
    );

    if (orderTotal > 0 && currentOrderTotal > 0 && currentServicePrice > 0) {
      return this.roundMoney(
        orderTotal * (currentServicePrice / currentOrderTotal),
      );
    }

    return currentServicePrice;
  }

  private getAppointmentPaymentShare(appointment: Appointment): number {
    const detail = appointment.orderDetail;

    const payment = detail?.order?.payment;

    if (!payment || payment.status !== PaymentStatus.PAID) {
      return 0;
    }

    const paymentAmount = Number(payment.amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return 0;
    }

    const orderTotal = Number(detail.total_price);

    const appointmentPrice = this.getAppointmentBookedPrice(appointment);

    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return 0;
    }

    return this.roundMoney(paymentAmount * (appointmentPrice / orderTotal));
  }

  private getAppointmentsByStatus(appointments: Appointment[]) {
    return {
      pending: appointments.filter(
        (appointment) => appointment.status === AppointmentStatus.PENDING,
      ).length,

      confirmed: appointments.filter(
        (appointment) => appointment.status === AppointmentStatus.CONFIRMED,
      ).length,

      completed: appointments.filter(
        (appointment) => appointment.status === AppointmentStatus.COMPLETED,
      ).length,

      cancelled: appointments.filter(
        (appointment) => appointment.status === AppointmentStatus.CANCELLED,
      ).length,

      expired: appointments.filter(
        (appointment) => appointment.status === AppointmentStatus.EXPIRED,
      ).length,
    };
  }

  private getAppointmentsEvolution(
    appointments: Appointment[],
    startDate: Date,
    endDate: Date,
  ) {
    const grouped = new Map<string, number>();

    const start = this.formatArgentinaDate(startDate);

    const end = this.formatArgentinaDate(endDate);

    const [startYear, startMonth, startDay] = start.split('-').map(Number);

    const [endYear, endMonth, endDay] = end.split('-').map(Number);

    const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));

    const lastDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    while (cursor <= lastDate) {
      const year = cursor.getUTCFullYear();

      const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');

      const day = String(cursor.getUTCDate()).padStart(2, '0');

      grouped.set(`${year}-${month}-${day}`, 0);

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const appointment of appointments) {
      const date = this.formatArgentinaDate(appointment.startAt);

      if (grouped.has(date)) {
        grouped.set(date, (grouped.get(date) || 0) + 1);
      }
    }

    return Array.from(grouped.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  private getTopServices(appointments: Appointment[]) {
    const services = new Map<
      string,
      {
        serviceId: string;
        name: string;
        appointments: number;
      }
    >();

    for (const appointment of appointments) {
      const service = appointment.service;

      if (!service) continue;

      const current = services.get(service.id);

      if (current) {
        current.appointments += 1;
      } else {
        services.set(service.id, {
          serviceId: service.id,
          name: service.name,
          appointments: 1,
        });
      }
    }

    return Array.from(services.values())
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 5);
  }

  private getTopProfessionals(appointments: Appointment[]) {
    const professionals = new Map<
      string,
      {
        professionalId: string;
        name: string;
        appointments: number;
      }
    >();

    for (const appointment of appointments) {
      const professional = appointment.professional;

      if (!professional) continue;

      const current = professionals.get(professional.id);

      if (current) {
        current.appointments += 1;
      } else {
        professionals.set(professional.id, {
          professionalId: professional.id,

          name: professional.user?.name || 'Sin nombre',

          appointments: 1,
        });
      }
    }

    return Array.from(professionals.values())
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 5);
  }

  private getDemandByWeekday(appointments: Appointment[]) {
    const weekdays = [
      {
        key: 'monday',
        label: 'Lunes',
      },
      {
        key: 'tuesday',
        label: 'Martes',
      },
      {
        key: 'wednesday',
        label: 'Miércoles',
      },
      {
        key: 'thursday',
        label: 'Jueves',
      },
      {
        key: 'friday',
        label: 'Viernes',
      },
      {
        key: 'saturday',
        label: 'Sábado',
      },
      {
        key: 'sunday',
        label: 'Domingo',
      },
    ];

    const counters = new Map<string, number>();

    weekdays.forEach((day) => counters.set(day.key, 0));

    for (const appointment of appointments) {
      const weekday = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: 'America/Argentina/Buenos_Aires',
      })
        .format(appointment.startAt)
        .toLowerCase();

      counters.set(weekday, (counters.get(weekday) || 0) + 1);
    }

    return weekdays.map((day) => ({
      weekday: day.key,
      label: day.label,
      appointments: counters.get(day.key) || 0,
    }));
  }

  private resolveDateRange(from?: string, to?: string) {
    const now = new Date();

    const today = this.formatArgentinaDate(now);

    const [year, month, day] = today.split('-');

    const defaultFrom = `01/${month}/${year}`;

    const defaultTo = `${day}/${month}/${year}`;

    const fromValue = from?.trim() || defaultFrom;

    const toValue = to?.trim() || defaultTo;

    const startDate = this.parseDateInput(fromValue, false);

    const endDate = this.parseDateInput(toValue, true);

    if (startDate > endDate) {
      throw new BadRequestException(
        'La fecha desde no puede ser posterior a la fecha hasta',
      );
    }

    return {
      from: fromValue,
      to: toValue,
      startDate,
      endDate,
    };
  }

  private parseDateInput(value: string, endOfDay = false): Date {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

    if (!match) {
      throw new BadRequestException(
        'Las fechas deben tener formato DD/MM/AAAA',
      );
    }

    const [, day, month, year] = match;

    const isoDate = `${year}-${month}-${day}`;

    const date = new Date(
      endOfDay ? `${isoDate}T23:59:59.999-03:00` : `${isoDate}T00:00:00-03:00`,
    );

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha ingresada no es válida');
    }

    const formatted = this.formatArgentinaDate(date);

    if (formatted !== isoDate) {
      throw new BadRequestException('La fecha ingresada no es válida');
    }

    return date;
  }

  private formatArgentinaDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;

    const month = parts.find((part) => part.type === 'month')?.value;

    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
