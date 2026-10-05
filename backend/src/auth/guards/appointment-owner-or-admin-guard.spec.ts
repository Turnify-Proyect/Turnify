import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppointmentOwnerOrAdminGuard } from './appointment-owner-or-admin.guard';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { UserRole } from '../../common/userRoles.enum';

describe('AppointmentOwnerOrAdminGuard', () => {
  let guard: AppointmentOwnerOrAdminGuard;

  let appointmentsRepository: {
    findOne: jest.Mock;
  };

  const createExecutionContext = (
    user: any,
    appointmentId: string,
  ): ExecutionContext => {
    const request = {
      user,
      params: {
        id: appointmentId,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    appointmentsRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentOwnerOrAdminGuard,
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentsRepository,
        },
      ],
    }).compile();

    guard = module.get<AppointmentOwnerOrAdminGuard>(
      AppointmentOwnerOrAdminGuard,
    );

    jest.clearAllMocks();
  });

  // ===========================================================================
  // Admin
  // ===========================================================================

  describe('usuario administrador', () => {
    it('debería permitir el acceso inmediatamente', async () => {
      const context = createExecutionContext(
        {
          id: 'admin-1',
          roles: [UserRole.ADMIN],
        },
        'appointment-1',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      expect(appointmentsRepository.findOne).not.toHaveBeenCalled();
    });

    it('debería permitir el acceso aunque el turno no exista', async () => {
      const context = createExecutionContext(
        {
          id: 'admin-1',
          roles: [UserRole.ADMIN],
        },
        'appointment-inexistente',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      expect(appointmentsRepository.findOne).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Usuario propietario
  // ===========================================================================

  describe('usuario propietario', () => {
    it('debería permitir el acceso si el usuario es dueño del turno', async () => {
      appointmentsRepository.findOne.mockResolvedValue({
        id: 'appointment-1',
        user: {
          id: 'user-1',
        },
      });

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-1',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('debería buscar el turno usando el id de los params', async () => {
      appointmentsRepository.findOne.mockResolvedValue({
        id: 'appointment-123',
        user: {
          id: 'user-1',
        },
      });

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-123',
      );

      await guard.canActivate(context);

      expect(appointmentsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'appointment-123',
        },
        relations: {
          user: true,
        },
      });
    });
  });

  // ===========================================================================
  // Usuario que no es propietario
  // ===========================================================================

  describe('usuario que no es propietario', () => {
    it('debería lanzar ForbiddenException', async () => {
      appointmentsRepository.findOne.mockResolvedValue({
        id: 'appointment-1',
        user: {
          id: 'otro-usuario',
        },
      });

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-1',
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('No tienes permiso para acceder a este turno'),
      );
    });

    it('no debería permitir acceder al turno de otro usuario', async () => {
      appointmentsRepository.findOne.mockResolvedValue({
        id: 'appointment-1',
        user: {
          id: 'user-2',
        },
      });

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-1',
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===========================================================================
  // Turno inexistente
  // ===========================================================================

  describe('turno inexistente', () => {
    it('debería lanzar NotFoundException', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-inexistente',
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        new NotFoundException('Turno no encontrado'),
      );
    });

    it('no debería permitir el acceso si el turno no existe', async () => {
      appointmentsRepository.findOne.mockResolvedValue(null);

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-inexistente',
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // Roles
  // ===========================================================================

  describe('roles', () => {
    it('debería permitir a un usuario que tenga ADMIN entre varios roles', async () => {
      const context = createExecutionContext(
        {
          id: 'admin-1',
          roles: [UserRole.CLIENT, UserRole.ADMIN],
        },
        'appointment-1',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      expect(appointmentsRepository.findOne).not.toHaveBeenCalled();
    });

    it('debería consultar el turno si el usuario no tiene rol ADMIN', async () => {
      appointmentsRepository.findOne.mockResolvedValue({
        id: 'appointment-1',
        user: {
          id: 'user-1',
        },
      });

      const context = createExecutionContext(
        {
          id: 'user-1',
          roles: [UserRole.CLIENT],
        },
        'appointment-1',
      );

      await guard.canActivate(context);

      expect(appointmentsRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
