import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// MODIFICACIÓN:
// UpdateUserDto permite actualizar datos generales del perfil,
// pero excluye password y confirmPassword.
// El cambio de contraseña debe manejarse por separado para poder
// validar y hashear la nueva contraseña antes de persistirla.
//coemntado por:Lautaro-dev
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'confirmPassword'] as const),
) {}
