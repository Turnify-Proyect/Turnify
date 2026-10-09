import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de seguridad recibido en el correo electrónico del usuario para autorizar el cambio',
    example: '8f7d6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'Nueva contraseña elegida por el usuario (Debe tener un mínimo de 8 caracteres)',
    format: 'password',
    minLength: 8,
    example: 'Abc1234!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
