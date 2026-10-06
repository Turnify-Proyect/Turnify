import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { CreateOrderAppointmentDto } from './create-order.dto';

export class CreateAdminOrderDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del cliente para el cual el administrador crea la reserva',
  })
  @IsUUID()
  userId!: string;

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
