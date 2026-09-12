import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
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
  // El DTO recibe la contraseña en texto plano como "password".
  // "password_hash" queda reservado exclusivamente para la entidad y la DB.
  //coemntado por:Lautaro-dev
  password!: string;

  @ApiProperty({
    description: 'Confirmar password debe ser igual a la contraseña',
    example: 'Abc1234!',
  })
  @IsNotEmpty()
  @Validate(MatchPassword, ['password'])
  // Solo se utiliza para verificar que ambas contraseñas coincidan.
  // No se persiste ni se envía al Repository.
  //coemntado por:Lautaro-dev
  confirmPassword!: string;

  // El teléfono es obligatorio y se recibe como string porque no representa un valor matemático y puede contener prefijos, espacios o código de país.
  //coemntado por:Lautaro-dev
  @ApiProperty({
    description: 'Telefono del usuario',
    example: '+54 343 1234567',
  })
  @IsNotEmpty({ message: 'Telefono es requerido' })
  @IsString({ message: 'Telefono debe ser un string' })
  @MaxLength(20, { message: 'Telefono de no mas de 20 caracteres' })
  // El teléfono es obligatorio y se recibe como string porque puede contener
  // prefijos, código de país, espacios y ceros iniciales.
  //coemntado por:Lautaro-dev
  phone!: string;

  // Agregué @IsOptional() + ? y nullable:true para dejarlo como campo opcional para el usuario
  // Cambié @ApiProperty por @ApiPropertyOptional para que swagger lo entienda como un campo opcional
  //coemntado por:Lautaro-dev
  @ApiPropertyOptional({
    description: 'Pais del usuario',
    example: 'Argentina',
  })
  @IsOptional()
  @IsString({ message: 'Pais debe ser un string' })
  @MinLength(5, { message: 'Pais de al menos 5 caracteres' })
  @MaxLength(15, { message: 'Pais de no mas de 15 caracteres' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Direccion del usuario',
    example: 'Calle falsa 15472',
  })
  @IsOptional()
  @IsString({ message: 'Direccion debe ser un string' })
  @MinLength(3, { message: 'Direccion de al menos 3 caracteres' })
  @MaxLength(80, { message: 'Direccion de no mas de 80 caracteres' })
  address?: string;

  @ApiPropertyOptional({
    description: 'Ciudad del usuario',
    example: 'Rosario',
  })
  @IsOptional()
  @IsString({ message: 'Ciudad debe ser un string' })
  @MinLength(5, { message: 'Ciudad de al menos 5 caracteres' })
  @MaxLength(20, { message: 'Ciudad de no mas de 20 caracteres' })
  city?: string;
}

export class LoginUserDto extends PickType(CreateUserDto, [
  'email',
  'password',
]) {}
