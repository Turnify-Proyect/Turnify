import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../common/userRoles.enum';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}