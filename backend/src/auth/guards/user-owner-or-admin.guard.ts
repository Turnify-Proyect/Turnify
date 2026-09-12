import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../common/userRoles.enum';

@Injectable()
export class UserOwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const userId = request.params.id;

    const isAdmin = user.roles.includes(UserRole.ADMIN);
    const isOwner = user.id === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este usuario',
      );
    }

    return true;
  }
}
