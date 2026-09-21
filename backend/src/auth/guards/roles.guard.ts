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
    //Cree esta validacion para que el .some no rompa si por algun motivo no se declaran roles especificos para la ruta
    //coemntado por:Lautaro-dev
    if (!routeRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    console.log(request.user);

    if (!request.user) {
      throw new ForbiddenException('Usuario no autenticado');
    }
    //cambié la identacion "request.user.Roles" por "request.user.roles"
    //coemntado por:Lautaro-dev
    const userRoles: UserRole[] = request.user.roles;
    console.log(userRoles);
    console.log(!Array.isArray(userRoles));

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
