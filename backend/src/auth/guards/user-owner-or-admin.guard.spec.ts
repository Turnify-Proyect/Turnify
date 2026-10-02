import {
ExecutionContext,
ForbiddenException,
} from '@nestjs/common';
import { UserOwnerOrAdminGuard } from './user-owner-or-admin.guard';
import { UserRole } from '../../common/userRoles.enum';

describe('UserOwnerOrAdminGuard', () => {
let guard: UserOwnerOrAdminGuard;

const createContext = (
user: any,
userId: string,
): ExecutionContext => {
const request = {
user,
params: {
id: userId,
},
};

return {
  switchToHttp: () => ({
    getRequest: () => request,
  }),
} as ExecutionContext;


};

beforeEach(() => {
guard = new UserOwnerOrAdminGuard();
});

describe('canActivate', () => {
it('debería estar definido', () => {
expect(guard).toBeDefined();
});

it('debería permitir el acceso si el usuario es administrador', () => {
  const user = {
    id: 'user-1',
    roles: [UserRole.ADMIN],
  };

  const context = createContext(user, 'user-999');

  const result = guard.canActivate(context);

  expect(result).toBe(true);
});

it('debería permitir el acceso si el usuario es propietario', () => {
  const user = {
    id: 'user-1',
    roles: [],
  };

  const context = createContext(user, 'user-1');

  const result = guard.canActivate(context);

  expect(result).toBe(true);
});

it('debería permitir el acceso si el usuario es propietario y además administrador', () => {
  const user = {
    id: 'user-1',
    roles: [UserRole.ADMIN],
  };

  const context = createContext(user, 'user-1');

  const result = guard.canActivate(context);

  expect(result).toBe(true);
});

it('debería rechazar el acceso si el usuario no es propietario ni administrador', () => {
  const user = {
    id: 'user-1',
    roles: [],
  };

  const context = createContext(user, 'user-2');

  expect(() => guard.canActivate(context)).toThrow(
    new ForbiddenException(
      'No tienes permiso para acceder a este usuario',
    ),
  );
});

it('debería rechazar el acceso si el usuario tiene otro rol pero no es propietario', () => {
  const user = {
    id: 'user-1',
    roles: [UserRole.PROFESSIONAL],
  };

  const context = createContext(user, 'user-2');

  expect(() => guard.canActivate(context)).toThrow(
    new ForbiddenException(
      'No tienes permiso para acceder a este usuario',
    ),
  );
});

it('debería comparar el id del usuario autenticado con el id de la URL', () => {
  const user = {
    id: 'user-123',
    roles: [],
  };

  const context = createContext(user, 'user-123');

  expect(guard.canActivate(context)).toBe(true);
});


});
});