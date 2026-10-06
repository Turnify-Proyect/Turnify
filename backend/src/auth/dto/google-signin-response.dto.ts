import { ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleSignInResponseDto {
  @ApiPropertyOptional({
    example: 'Usuario logueado con Google',
  })
  message?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  token?: string;

  @ApiPropertyOptional({
    example: true,
  })
  needsPhone?: boolean;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'Token temporal para completar el registro',
  })
  registrationToken?: string;
}
