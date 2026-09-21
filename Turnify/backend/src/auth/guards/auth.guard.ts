import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('No se ha enviado token');
    }

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('No se ha enviado token');
    }

    // JwtService ya fue configurado globalmente con JWT_SECRET en AppModule, por eso verify() puede validar el token usando esa misma configuración sin volver a pasar el secret manualmente en este guard.
    //coemntado por:Lautaro-dev
    try {
      const payload = this.jwtService.verify(token);

      // Guardamos el payload verificado en la request para que los siguientes
      // guards y controladores puedan acceder al id y roles del usuario.
      //coemntado por:Lautaro-dev
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('El token ha expirado');
      }
      throw new UnauthorizedException('Error al validar token');
    }
  }
}
