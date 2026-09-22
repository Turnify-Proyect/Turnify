import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderAppointmentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del profesional seleccionado',
  })
  @IsUUID()
  @IsNotEmpty()
  professionalId!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del servicio seleccionado',
  })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({
    example: '2026-09-25T15:00:00.000Z',
    description: 'Fecha y hora de inicio del turno',
  })
  @IsDateString()
  @IsNotEmpty()
  startAt!: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Turnos incluidos en la orden',
    type: [CreateOrderAppointmentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderAppointmentDto)
  appointments!: CreateOrderAppointmentDto[];
}