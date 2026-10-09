import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiPropertyOptional({
    description: 'Nueva fecha y hora seleccionada para el turno en formato completo ISO 8601 (Debe cumplir un mínimo de 24 horas de anticipación al momento de la solicitud)',
    format: 'date-time',
    example: '2026-10-16T14:30:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startAt!: string;

  @ApiPropertyOptional({
    description: 'ID de un profesional alternativo en formato UUID si se desea cambiar el especialista de la cita',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @ApiPropertyOptional({
    description: 'ID de un nuevo servicio en formato UUID si se desea cambiar la prestación de la cita',
    format: 'uuid',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
