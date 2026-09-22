import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la orden que se va a pagar',
  })
  @IsNotEmpty({ message: 'El orderId es obligatorio' })
  @IsUUID('4', { message: 'El orderId debe ser un UUID válido' })
  orderId!: string;
}
