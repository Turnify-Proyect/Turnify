import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { UserRole } from '../../common/userRoles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const routeRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new ForbiddenException('Usuario no autenticado');
    }
    const userRoles: UserRole[] = request.user.roles;

    if (!userRoles || !Array.isArray(userRoles)) {
      throw new ForbiddenException('El usuario no tiene roles');
    }

    const isAllowed = routeRoles.some((role) => userRoles.includes(role));

    if (!isAllowed) {
      throw new ForbiddenException('Sin permiso para acceder al recurso');
    }

    return true;
  }
}
