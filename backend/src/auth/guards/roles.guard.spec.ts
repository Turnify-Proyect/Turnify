import {
ExecutionContext,
ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../common/userRoles.enum';

describe('RolesGuard', () => {
let guard: RolesGuard;
let reflector: {
getAllAndOverride: jest.Mock;
};

const createContext = (user?: any): ExecutionContext => {
const request = {
user,
};

return {
  getHandler: jest.fn(),
  getClass: jest.fn(),
  switchToHttp: () => ({
    getRequest: () => request,
  }),
} as unknown as ExecutionContext;


};

beforeEach(() => {
reflector = {
getAllAndOverride: jest.fn(),
};

guard = new RolesGuard(
  reflector as unknown as Reflector,
);


});

describe('canActivate', () => {
it('debería estar definido', () => {
expect(guard).toBeDefined();
});

it('debería permitir el acceso cuando la ruta no tiene roles definidos', () => {
  reflector.getAllAndOverride.mockReturnValue(undefined);

  const context = createContext();

  const result = guard.canActivate(context);

  expect(result).toBe(true);

  expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
    context.getHandler(),
    context.getClass(),
  ]);
});

it('debería rechazar el acceso cuando no hay usuario autenticado', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
  ]);

  const context = createContext(undefined);

  expect(() => guard.canActivate(context)).toThrow(
    new ForbiddenException('Usuario no autenticado'),
  );
});

it('debería rechazar el acceso cuando el usuario no tiene roles', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
  ]);

  const context = createContext({
    id: 'user-1',
  });

  expect(() => guard.canActivate(context)).toThrow(
    new ForbiddenException('El usuario no tiene roles'),
  );
});

it('debería rechazar el acceso cuando roles no es un array', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
  ]);

  const context = createContext({
    id: 'user-1',
    roles: 'admin',
  });

  expect(() => guard.canActivate(context)).toThrow(
    new ForbiddenException('El usuario no tiene roles'),
  );
});

it('debería permitir el acceso cuando el usuario tiene el rol requerido', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
  ]);

  const context = createContext({
    id: 'user-1',
    roles: [UserRole.ADMIN],
  });

  const result = guard.canActivate(context);

  expect(result).toBe(true);
});

it('debería permitir el acceso cuando el usuario tiene uno de los roles requeridos', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
    UserRole.PROFESSIONAL,
  ]);

  const context = createContext({
    id: 'user-1',
    roles: [UserRole.PROFESSIONAL],
  });

  const result = guard.canActivate(context);

  expect(result).toBe(true);
});

it('debería rechazar el acceso cuando el usuario no tiene ninguno de los roles requeridos', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
  ]);

  const context = createContext({
    id: 'user-1',
    roles: [UserRole.CLIENT],
  });

  expect(() => guard.canActivate(context)).toThrow(
    new ForbiddenException(
      'Sin permiso para acceder al recurso',
    ),
  );
});

it('debería permitir el acceso si el usuario tiene varios roles y uno coincide', () => {
  reflector.getAllAndOverride.mockReturnValue([
    UserRole.ADMIN,
  ]);

  const context = createContext({
    id: 'user-1',
    roles: [
      UserRole.CLIENT,
      UserRole.PROFESSIONAL,
      UserRole.ADMIN,
    ],
  });

  const result = guard.canActivate(context);

  expect(result).toBe(true);
});


});
});