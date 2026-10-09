import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../../common/userRoles.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'Lista de nuevos roles asignados al usuario',
    type: [String],
    enum: UserRole,
    isArray: true,
    example: [UserRole.CLIENT],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
