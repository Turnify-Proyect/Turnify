import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType } from '../entities/payment.entity';

export class ProcessCashPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la orden que se abonará en efectivo',
  })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    enum: PaymentType,
    example: PaymentType.DEPOSIT_PAYMENT,
    description:
      'Indica si se cobró únicamente la seña o el valor total de la orden',
  })
  @IsEnum(PaymentType)
  paymentType!: PaymentType;
}
