import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class ProcessPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único de la orden a la cual pertenece este pago',
  })
  @IsNotEmpty({ message: 'El orderId es obligatorio' })
  @IsUUID('4', { message: 'El orderId debe ser un UUID válido' })
  orderId!: string;

  @ApiProperty({
    example: 4500.0,
    description: 'Monto total abonado en la transacción',
  })
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  amount!: number;

  @ApiProperty({
    example: 'mercadopago',
    description: 'Proveedor de la pasarela de pagos',
    default: 'mercadopago',
  })
  @IsNotEmpty({ message: 'El proveedor de pago es obligatorio' })
  @IsString({ message: 'El proveedor debe ser una cadena de texto' })
  provider!: string;

  @ApiProperty({
    example: 'mp_pay_987654321',
    description: 'ID de transacción generado por la pasarela de pagos externa',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El ID externo debe ser una cadena de texto' })
  externalPaymentId?: string;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description: 'Estado del procesamiento del pago',
  })
  @IsNotEmpty({ message: 'El estado del pago es obligatorio' })
  @IsEnum(PaymentStatus, { message: 'El estado del pago no es válido' })
  status!: PaymentStatus;
}
