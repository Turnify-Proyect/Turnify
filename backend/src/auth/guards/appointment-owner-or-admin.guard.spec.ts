import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

import { AppointmentOwnerOrAdminGuard } from './appointment-owner-or-admin.guard';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { UserRole } from '../../common/userRoles.enum';

describe('AppointmentOwnerOrAdminGuard', () => {
  let guard: AppointmentOwnerOrAdminGuard;
  let appointmentsRepository: jest.Mocked<Repository<Appointment>>;

  beforeEach(() => {
    appointmentsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Appointment>>;

    guard = new AppointmentOwnerOrAdminGuard(appointmentsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createExecutionContext = (
    user: {
      id: string;
      roles: UserRole[];
    },
    appointmentId = 'appointment-1',
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: {
            id: appointmentId,
          },
        }),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow an admin without querying the appointment', async () => {
      const user = {
        id: 'admin-1',
        roles: [UserRole.ADMIN],
      };

      const context = createExecutionContext(user);

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(appointmentsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should allow the owner of the appointment', async () => {
      const user = {
        id: 'user-1',
        roles: [],
      };

      const appointment = {
        id: 'appointment-1',
        user: {
          id: 'user-1',
        },
      } as unknown as Appointment;

      appointmentsRepository.findOne.mockResolvedValue(appointment);

      const context = createExecutionContext(user, 'appointment-1');

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(appointmentsRepository.findOne).toHaveBeenCalledTimes(1);

      expect(appointmentsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'appointment-1',
        },
        relations: {
          user: true,
        },
      });
    });

    it('should throw ForbiddenException when the user is not the owner', async () => {
      const user = {
        id: 'user-1',
        roles: [],
      };

      const appointment = {
        id: 'appointment-1',
        user: {
          id: 'user-2',
        },
      } as unknown as Appointment;

      appointmentsRepository.findOne.mockResolvedValue(appointment);

      const context = createExecutionContext(user, 'appointment-1');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('No tienes permiso para acceder a este turno'),
      );

      expect(appointmentsRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when the appointment does not exist', async () => {
      const user = {
        id: 'user-1',
        roles: [],
      };

      appointmentsRepository.findOne.mockResolvedValue(null);

      const context = createExecutionContext(user, 'appointment-1');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new NotFoundException('Turno no encontrado'),
      );

      expect(appointmentsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'appointment-1',
        },
        relations: {
          user: true,
        },
      });
    });

    it('should use the appointment ID from request params', async () => {
      const user = {
        id: 'user-1',
        roles: [],
      };

      const appointment = {
        id: 'appointment-123',
        user: {
          id: 'user-1',
        },
      } as unknown as Appointment;

      appointmentsRepository.findOne.mockResolvedValue(appointment);

      const context = createExecutionContext(user, 'appointment-123');

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(appointmentsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'appointment-123',
        },
        relations: {
          user: true,
        },
      });
    });

    it('should allow a user with a non-admin role when they own the appointment', async () => {
      const user = {
        id: 'user-1',
        roles: [UserRole.CLIENT],
      };

      const appointment = {
        id: 'appointment-1',
        user: {
          id: 'user-1',
        },
      } as unknown as Appointment;

      appointmentsRepository.findOne.mockResolvedValue(appointment);

      const context = createExecutionContext(user, 'appointment-1');

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should reject a non-admin user who owns a different appointment', async () => {
      const user = {
        id: 'user-1',
        roles: [UserRole.CLIENT],
      };

      const appointment = {
        id: 'appointment-1',
        user: {
          id: 'user-2',
        },
      } as unknown as Appointment;

      appointmentsRepository.findOne.mockResolvedValue(appointment);

      const context = createExecutionContext(user, 'appointment-1');

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
