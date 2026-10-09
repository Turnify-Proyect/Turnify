import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { UserRole } from '../../common/userRoles.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (request: any): ExecutionContext =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const request = {};

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        'handler',
        'class',
      ]);
    });

    it('should throw when there is no authenticated user', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: undefined,
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException('Usuario no autenticado'),
      );
    });

    it('should throw when the user has no roles', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: {},
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException('El usuario no tiene roles'),
      );
    });

    it('should throw when user roles are not an array', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: {
          roles: 'ADMIN',
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException('El usuario no tiene roles'),
      );
    });

    it('should allow access when the user has the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: {
          roles: [UserRole.ADMIN],
        },
      };

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it('should allow access when the user has one of the required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.PROFESSIONAL,
      ]);

      const request = {
        user: {
          roles: [UserRole.PROFESSIONAL],
        },
      };

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it('should throw when the user does not have any required role', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: {
          roles: [UserRole.CLIENT],
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException(
          'Sin permiso para acceder al recurso',
        ),
      );
    });

    it('should throw when the user has an empty roles array', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: {
          roles: [],
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException(
          'Sin permiso para acceder al recurso',
        ),
      );
    });

    it('should check handler and class metadata', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
      ]);

      const request = {
        user: {
          roles: [UserRole.ADMIN],
        },
      };

      const context = createContext(request);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        'roles',
        ['handler', 'class'],
      );
    });
  });
});
