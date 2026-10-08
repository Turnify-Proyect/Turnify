import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    guard = new AuthGuard(jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  describe('canActivate', () => {
    it('should allow access with a valid Bearer token', () => {
      const payload = {
        id: 'user-1',
        roles: ['CLIENT'],
      };

      const request = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      jwtService.verify.mockReturnValue(payload as any);

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(request.user).toEqual(payload);
    });

    it('should throw when authorization header is missing', () => {
      const request = {
        headers: {},
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(new UnauthorizedException('No se ha enviado token'));

      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should throw when authorization header is not Bearer', () => {
      const request = {
        headers: {
          authorization: 'Basic some-token',
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(new UnauthorizedException('No se ha enviado token'));

      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should throw when Bearer token is missing', () => {
      const request = {
        headers: {
          authorization: 'Bearer',
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(new UnauthorizedException('No se ha enviado token'));

      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should accept lowercase bearer', () => {
      const payload = {
        id: 'user-1',
        roles: ['CLIENT'],
      };

      const request = {
        headers: {
          authorization: 'bearer valid-token',
        },
      };

      jwtService.verify.mockReturnValue(payload as any);

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(request.user).toEqual(payload);
    });

    it('should throw when the token has expired', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';

      const request = {
        headers: {
          authorization: 'Bearer expired-token',
        },
      };

      jwtService.verify.mockImplementation(() => {
        throw expiredError;
      });

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(new UnauthorizedException('El token ha expirado'));
    });

    it('should throw when the token is invalid', () => {
      const invalidError = new Error('invalid token');

      const request = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      jwtService.verify.mockImplementation(() => {
        throw invalidError;
      });

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(new UnauthorizedException('Error al validar token'));
    });

    it('should rethrow an UnauthorizedException from JwtService', () => {
      const unauthorizedError = new UnauthorizedException(
        'Custom unauthorized error',
      );

      const request = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      jwtService.verify.mockImplementation(() => {
        throw unauthorizedError;
      });

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(unauthorizedError);
    });
  });
});
