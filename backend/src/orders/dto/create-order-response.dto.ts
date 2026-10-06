import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';
import { AppointmentStatus } from '../../appointments/entities/appointment.entity';

export class OrderAppointmentResponseDto {
  @ApiProperty({
    example: '3f2b8c1e-5a47-4d0e-9d6b-2c1f7a9e4b10',
  })
  id!: string;

  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.PENDING,
  })
  status!: AppointmentStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-10T13:00:00.000Z',
  })
  startAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-10T14:00:00.000Z',
  })
  endAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-05T20:10:00.000Z',
    description: 'Vencimiento de la reserva si no se completa el pago',
  })
  expiresAt!: Date | null;
}

export class CreateOrderResponseDto {
  @ApiProperty({
    example: '9a6d1f52-8c3b-4e7a-b1d2-5f0e3c4a7b88',
  })
  orderId!: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @ApiProperty({
    example: 25000,
    description: 'Suma de los precios de todos los servicios de la orden',
  })
  totalPrice!: number;

  @ApiProperty({
    type: [OrderAppointmentResponseDto],
  })
  appointments!: OrderAppointmentResponseDto[];
}
