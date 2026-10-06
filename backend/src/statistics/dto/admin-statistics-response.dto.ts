import { ApiProperty } from '@nestjs/swagger';

export class StatisticsPeriodDto {
  @ApiProperty({
    example: '01/10/2026',
    description: 'Fecha inicial (DD/MM/AAAA)',
  })
  from!: string;

  @ApiProperty({
    example: '31/10/2026',
    description: 'Fecha final (DD/MM/AAAA)',
  })
  to!: string;
}

export class StatisticsSummaryDto {
  @ApiProperty({ example: 120 })
  totalAppointments!: number;

  @ApiProperty({ example: 80 })
  completedAppointments!: number;

  @ApiProperty({ example: 10 })
  cancelledAppointments!: number;

  @ApiProperty({
    example: 8.33,
    description: 'Porcentaje de turnos cancelados sobre el total',
  })
  cancellationRate!: number;

  @ApiProperty({
    example: 45000,
    description:
      'Señas cobradas. Incluye pagos antiguos sin tipo y señas registradas en efectivo',
  })
  depositRevenue!: number;

  @ApiProperty({
    example: 60000,
    description: 'Pagos completos cobrados por adelantado',
  })
  fullPaymentRevenue!: number;

  @ApiProperty({
    example: 260000,
    description:
      'Saldo cobrado al completar los turnos: precio del servicio menos lo ya pagado',
  })
  completionRevenue!: number;

  @ApiProperty({
    example: 365000,
    description:
      'Suma de señas, pagos completos y saldos de turnos completados',
  })
  totalRevenue!: number;
}

export class AppointmentsByStatusDto {
  @ApiProperty({ example: 5 })
  pending!: number;

  @ApiProperty({ example: 25 })
  confirmed!: number;

  @ApiProperty({ example: 80 })
  completed!: number;

  @ApiProperty({ example: 10 })
  cancelled!: number;

  @ApiProperty({ example: 0 })
  expired!: number;
}

export class AppointmentsEvolutionItemDto {
  @ApiProperty({ example: '2026-10-05', description: 'Día (AAAA-MM-DD)' })
  date!: string;

  @ApiProperty({ example: 4, description: 'Turnos de ese día' })
  count!: number;
}

export class TopServiceDto {
  @ApiProperty({ example: '3f2b8c1e-5a47-4d0e-9d6b-2c1f7a9e4b10' })
  serviceId!: string;

  @ApiProperty({ example: 'Masaje descontracturante' })
  name!: string;

  @ApiProperty({ example: 32 })
  appointments!: number;
}

export class TopProfessionalDto {
  @ApiProperty({ example: '9a6d1f52-8c3b-4e7a-b1d2-5f0e3c4a7b88' })
  professionalId!: string;

  @ApiProperty({ example: 'Ana Pérez' })
  name!: string;

  @ApiProperty({ example: 41 })
  appointments!: number;
}

export class DemandByWeekdayDto {
  @ApiProperty({ example: 'monday' })
  weekday!: string;

  @ApiProperty({ example: 'Lunes' })
  label!: string;

  @ApiProperty({ example: 18 })
  appointments!: number;
}

export class AdminStatisticsResponseDto {
  @ApiProperty({ type: StatisticsPeriodDto })
  period!: StatisticsPeriodDto;

  @ApiProperty({ type: StatisticsSummaryDto })
  summary!: StatisticsSummaryDto;

  @ApiProperty({ type: AppointmentsByStatusDto })
  appointmentsByStatus!: AppointmentsByStatusDto;

  @ApiProperty({
    type: [AppointmentsEvolutionItemDto],
    description:
      'Un elemento por cada día del período, con 0 si no hubo turnos',
  })
  appointmentsEvolution!: AppointmentsEvolutionItemDto[];

  @ApiProperty({
    type: [TopServiceDto],
    description: 'Los 5 servicios con más turnos',
  })
  topServices!: TopServiceDto[];

  @ApiProperty({
    type: [TopProfessionalDto],
    description: 'Los 5 profesionales con más turnos',
  })
  topProfessionals!: TopProfessionalDto[];

  @ApiProperty({
    type: [DemandByWeekdayDto],
    description: 'Turnos por día de la semana, de lunes a domingo',
  })
  demandByWeekday!: DemandByWeekdayDto[];
}
