import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../entities/availability.entity';

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Día de la semana en el cual se abrirá el bloque de atención',
    enum: DayOfWeek,
    example: DayOfWeek[Object.keys(DayOfWeek)[1]] || 'LUNES',
  })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek!: DayOfWeek;

   @ApiProperty({
    description: 'Hora de inicio del bloque de atención en formato de 24 horas (HH:mm)',
    pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
    example: '09:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime debe tener formato HH:mm',
  })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime debe tener formato HH:mm',
  })
  endTime!: string;
}
