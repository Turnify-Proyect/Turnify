import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Correo electrónico asociado a la cuenta que desea recuperar la contraseña',
    example: 'cliente@email.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
