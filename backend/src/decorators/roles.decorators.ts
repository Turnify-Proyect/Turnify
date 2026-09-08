import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../common/userRoles.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
