import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateOrderAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  professionalId!: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @IsDateString()
  @IsNotEmpty()
  startAt!: string;
}