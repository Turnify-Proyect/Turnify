import { ApiProperty } from '@nestjs/swagger';

export class AuthSignInResponseDto {
  @ApiProperty({
    example: 'Usuario logueado',
  })
  message!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token JWT para autenticación',
  })
  token!: string;
}
