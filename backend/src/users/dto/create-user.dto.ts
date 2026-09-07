import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { MatchPassword } from '../../decorators/matchPassword.decorator';

export class CreateUserDto {
  @ApiProperty({
    description:
      'Nombre de usuario debe tener al menos 3 y no mas de 50 caracteres',
    example: 'admin',
  })
  @IsNotEmpty({ message: 'Nombre es requerido' })
  @IsString({ message: 'Nombre debe ser un string' })
  @MinLength(3, { message: 'Nombre de al menos 3 caracteres' })
  @MaxLength(50, { message: 'Nombre de no mas de 50 caracteres' })
  name!: string;

  @ApiProperty({
    description: 'Email debe ser valido y unico',
    example: 'admin@admin.com',
  })
  @IsNotEmpty({ message: 'Email es requerido' })
  @IsEmail({}, { message: 'Email debe ser valido' })
  email!: string;

  @ApiProperty({
    description:
      'Password debe ser un string de al menos 8 caracteres, no más de 15 caracteres, tener minimo 1 minuscula, 1 mayuscula, 1 numero y 1 simbolo',
    example: 'Abc1234!',
  })
  @IsNotEmpty({ message: 'Password es requerido' })
  @IsString({ message: 'Password debe ser un string' })
  @MinLength(8, { message: 'Password de al menos 8 caracteres' })
  @MaxLength(15, { message: 'Password de no mas de 15 caracteres' })
  @IsStrongPassword(
    {
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password debe tener minimo 1 minuscula, 1 mayuscula, 1 numero y 1 simbolo',
    },
  )
  password_hash!: string;

  @ApiProperty({
    description: 'Confirmar password debe ser igual a la contraseña',
    example: 'Abc123!',
  })
  @IsNotEmpty()
  @Validate(MatchPassword, ['password'])
  confirmPassword!: string;

  @ApiProperty({
    description:
      'Telefono debe ser un numero y no debe ser un NaN ni un Infinito',
    example: 1234567890,
  })
  @IsNotEmpty({ message: 'Telefono es requerido' })
  @IsNumber(
    {
      allowNaN: false,
      allowInfinity: false,
    },
    { message: 'Telefono no debe ser un NaN ni un Infinito' },
  )
  phone!: number;

  @ApiProperty({
    description:
      'Pais del usuario debe tener al menos 5 y no mas de 15 caracteres',
    example: 'Argentina',
  })
  @IsString({ message: 'Pais es requerido' })
  @MinLength(5, { message: 'Pais de al menos 5 caracteres' })
  @MaxLength(15, { message: 'Pais de no mas de 15 caracteres' })
  country!: string;

  @ApiProperty({
    description:
      'Direccion del usuario debe tener al menos 3 y no mas de 80 caracteres',
    example: 'Calle falsa 15472',
  })
  @IsString({ message: 'Direccion es requerido' })
  @MinLength(3, { message: 'Direccion de al menos 3 caracteres' })
  @MaxLength(80, { message: 'Direccion de no mas de 80 caracteres' })
  address!: string;

  @ApiProperty({
    description:
      'Ciudad del usuario debe tener al menos 5 y no mas de 20 caracteres',
    example: 'Rosario',
  })
  @IsString({ message: 'Ciudad es requerido ' })
  @MinLength(5, { message: 'Ciudad de al menos 5 caracteres' })
  @MaxLength(20, { message: 'Ciudad de no mas de 20 caracteres' })
  city!: string;
}

export class LoginUserDto extends PickType(CreateUserDto, [
  'email',
  'password_hash',
]) {}
