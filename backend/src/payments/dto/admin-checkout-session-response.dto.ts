import { ApiProperty } from '@nestjs/swagger';

export class AdminCheckoutSessionResponseDto {
  @ApiProperty({
    example: '9a6d1f52-8c3b-4e7a-b1d2-5f0e3c4a7b88',
  })
  orderId!: string;

  @ApiProperty({
    example: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3...',
    description: 'Enlace de pago de Stripe para el cliente',
  })
  checkoutUrl!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-05T20:30:00.000Z',
    description: 'Vencimiento del enlace de pago y de la reserva',
  })
  expiresAt!: Date;

  @ApiProperty({
    example: 'cliente@example.com',
    description: 'Email del cliente al que se envía el enlace',
  })
  email!: string;

  @ApiProperty({
    example: 7500,
    description: 'Monto de la seña a cobrar',
  })
  depositAmount!: number;

  @ApiProperty({
    example: true,
    description:
      'Indica si el correo con el enlace pudo enviarse. Si es false, el enlace igualmente fue generado',
  })
  emailSent!: boolean;
}
