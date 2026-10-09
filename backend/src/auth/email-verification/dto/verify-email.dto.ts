import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description:
      'Token de seguridad único generado por el sistema enviado al correo del usuario (64 caracteres hexadecimales)',
    minLength: 64,
    maxLength: 64,
    pattern: '^[a-f0-9]+$',
    example: '8f7d6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  @Matches(/^[a-f0-9]+$/i)
  token!: string;
}
