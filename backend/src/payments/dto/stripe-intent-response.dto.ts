import { ApiProperty } from '@nestjs/swagger';

export class StripeIntentResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'pi_3Nxxxxxxxxxxxxxx_secret_xxxxxxxxxxxxxxxxxxxxxxxx',
    description:
      'Secreto del PaymentIntent que el frontend usa para confirmar el pago con Stripe',
  })
  clientSecret!: string | null;
}
