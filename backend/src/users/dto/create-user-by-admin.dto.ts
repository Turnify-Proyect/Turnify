import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../../common/userRoles.enum';

export class CreateUserByAdminDto extends CreateUserDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}