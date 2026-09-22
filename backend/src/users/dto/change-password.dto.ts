import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { MatchPassword } from '../../decorators/matchPassword.decorator';

// DTO creado para gestionar el cambio de contraseña de forma independiente.
// Permite validar la fortaleza de la nueva contraseña y confirmar que coincida con confirmPassword.
// comentado por: Jose-dev
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'NuevaClave123!',
  })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString({ message: 'La nueva contraseña debe ser una cadena' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(15, {
    message: 'La contraseña no debe superar los 15 caracteres',
  })
  @IsStrongPassword(
    {
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'La contraseña debe incluir al menos 1 minúscula, 1 mayúscula, 1 número y 1 símbolo',
    },
  )
  password!: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NuevaClave123!',
  })
  @IsNotEmpty({ message: 'La confirmación es requerida' })
  @Validate(MatchPassword, ['password'])
  confirmPassword!: string;
}
