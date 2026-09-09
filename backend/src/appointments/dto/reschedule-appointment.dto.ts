import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  @IsOptional()
  startAt!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}