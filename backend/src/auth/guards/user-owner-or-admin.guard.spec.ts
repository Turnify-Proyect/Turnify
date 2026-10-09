import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { UserOwnerOrAdminGuard } from './user-owner-or-admin.guard';
import { UserRole } from '../../common/userRoles.enum';

describe('UserOwnerOrAdminGuard', () => {
  let guard: UserOwnerOrAdminGuard;

  beforeEach(() => {
    guard = new UserOwnerOrAdminGuard();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  describe('canActivate', () => {
    it('should allow access when the user is an admin', () => {
      const request = {
        user: {
          id: 'user-1',
          roles: [UserRole.ADMIN],
        },
        params: {
          id: 'user-2',
        },
      };

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it('should allow access when the user is the owner', () => {
      const request = {
        user: {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        params: {
          id: 'user-1',
        },
      };

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it('should allow access when the user is admin even if they are not the owner', () => {
      const request = {
        user: {
          id: 'admin-1',
          roles: [UserRole.ADMIN],
        },
        params: {
          id: 'user-1',
        },
      };

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it('should allow access when the user has multiple roles including admin', () => {
      const request = {
        user: {
          id: 'admin-1',
          roles: [
            UserRole.CLIENT,
            UserRole.ADMIN,
          ],
        },
        params: {
          id: 'user-1',
        },
      };

      const result = guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it('should throw when the user is neither admin nor owner', () => {
      const request = {
        user: {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        params: {
          id: 'user-2',
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException(
          'No tienes permiso para acceder a este usuario',
        ),
      );
    });

    it('should throw when the user has no roles', () => {
      const request = {
        user: {
          id: 'user-1',
          roles: [],
        },
        params: {
          id: 'user-2',
        },
      };

      expect(() =>
        guard.canActivate(createContext(request)),
      ).toThrow(
        new ForbiddenException(
          'No tienes permiso para acceder a este usuario',
        ),
      );
    });

    it('should compare the authenticated user id with the route id', () => {
      const request = {
        user: {
          id: 'user-123',
          roles: [UserRole.CLIENT],
        },
        params: {
          id: 'user-123',
        },
      };

      expect(guard.canActivate(createContext(request))).toBe(true);
    });
  });
});
