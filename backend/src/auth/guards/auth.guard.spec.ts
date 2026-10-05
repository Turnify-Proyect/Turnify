import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const jwtService = {
    verify: jest.fn(),
  };

  const createContext = (authorization?: string) => {
    const request: any = {
      headers: {},
    };

    if (authorization !== undefined) {
      request.headers.authorization = authorization;
    }

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    return {
      context,
      request,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new AuthGuard(jwtService as unknown as JwtService);
  });

  describe('canActivate', () => {
    it('debería estar definido', () => {
      expect(guard).toBeDefined();
    });

    it('debería rechazar la solicitud cuando no se envía authorization', () => {
      const { context } = createContext();

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('No se ha enviado token'),
      );

      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('debería rechazar un authorization que no utiliza Bearer', () => {
      const { context } = createContext('Basic abc123');

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('No se ha enviado token'),
      );

      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('debería rechazar un authorization sin token', () => {
      const { context } = createContext('Bearer');

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('No se ha enviado token'),
      );

      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('debería aceptar Bearer en mayúsculas', () => {
      const payload = {
        id: 'user-1',
        roles: ['client'],
      };

      jwtService.verify.mockReturnValue(payload);

      const { context, request } = createContext('BEARER valid-token');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(request.user).toEqual(payload);
    });

    it('debería aceptar Bearer en minúsculas', () => {
      const payload = {
        id: 'user-1',
        roles: ['client'],
      };

      jwtService.verify.mockReturnValue(payload);

      const { context, request } = createContext('bearer valid-token');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(request.user).toEqual(payload);
    });

    it('debería guardar el payload verificado en request.user', () => {
      const payload = {
        id: 'user-123',
        roles: ['admin'],
      };

      jwtService.verify.mockReturnValue(payload);

      const { context, request } = createContext('Bearer valid-token');

      guard.canActivate(context);

      expect(request.user).toEqual(payload);
    });

    it('debería rechazar un token expirado', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      jwtService.verify.mockImplementation(() => {
        throw error;
      });

      const { context } = createContext('Bearer expired-token');

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('El token ha expirado'),
      );

      expect(jwtService.verify).toHaveBeenCalledWith('expired-token');
    });

    it('debería rechazar un token inválido', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const { context } = createContext('Bearer invalid-token');

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Error al validar token'),
      );
    });

    it('debería propagar una UnauthorizedException generada por JwtService', () => {
      const error = new UnauthorizedException('Token inválido');

      jwtService.verify.mockImplementation(() => {
        throw error;
      });

      const { context } = createContext('Bearer invalid-token');

      expect(() => guard.canActivate(context)).toThrow(error);
    });
  });
});
