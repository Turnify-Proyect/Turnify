import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfessionalUnavailabilityDto {
  @ApiProperty({
    description: 'Fecha y hora de inicio del bloqueo en formato completo ISO 8601',
    format: 'date-time',
    example: '2026-10-15T08:00:00.000Z',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'Fecha y hora de finalización del bloqueo en formato completo ISO 8601',
    format: 'date-time',
    example: '2026-10-22T18:00:00.000Z',
  })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Motivo o razón justificante de la inasistencia o del bloqueo del rango horario',
    maxLength: 150,
    example: 'Licencia por vacaciones anuales',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  reason?: string;
}