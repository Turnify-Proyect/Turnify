import { Reflector } from '@nestjs/core';
import { UserRole } from '../common/userRoles.enum';

import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';

describe('ProfessionalsController', () => {
  let controller: ProfessionalsController;

  let professionalsServiceMock: {
    createProfessional: jest.Mock;
    getActiveProfessionals: jest.Mock;
    getAllProfessionals: jest.Mock;
    getProfessionalById: jest.Mock;
    getProfessionalByUserId: jest.Mock;
    updateProfessional: jest.Mock;
    softDeleteProfessional: jest.Mock;
    activateProfessional: jest.Mock;
    associateService: jest.Mock;
    getServicesByProfessional: jest.Mock;
    removeServiceFromProfessional: jest.Mock;
  };

  const professionalId = 'professional-123';
  const userId = 'user-123';
  const serviceId = 'service-123';

  beforeEach(() => {
    jest.clearAllMocks();

    professionalsServiceMock = {
      createProfessional: jest.fn(),
      getActiveProfessionals: jest.fn(),
      getAllProfessionals: jest.fn(),
      getProfessionalById: jest.fn(),
      getProfessionalByUserId: jest.fn(),
      updateProfessional: jest.fn(),
      softDeleteProfessional: jest.fn(),
      activateProfessional: jest.fn(),
      associateService: jest.fn(),
      getServicesByProfessional: jest.fn(),
      removeServiceFromProfessional: jest.fn(),
    };

    controller = new ProfessionalsController(
      professionalsServiceMock as unknown as ProfessionalsService,
    );
  });

  describe('createProfessional', () => {
    it('should call the service', async () => {
      const dto = {
        userId,
        specialty: 'masajes',
      };

      const response = {
        id: professionalId,
      };

      professionalsServiceMock.createProfessional.mockResolvedValue(response);

      const result = await controller.createProfessional(dto as any);

      expect(result).toBe(response);

      expect(professionalsServiceMock.createProfessional).toHaveBeenCalledWith(
        dto,
      );
    });
  });

  describe('getActiveProfessionals', () => {
    it('should return active professionals', async () => {
      const response = [{ id: professionalId }];

      professionalsServiceMock.getActiveProfessionals.mockResolvedValue(
        response,
      );

      const result = await controller.getActiveProfessionals();

      expect(result).toBe(response);

      expect(
        professionalsServiceMock.getActiveProfessionals,
      ).toHaveBeenCalled();
    });
  });

  describe('getAllProfessionals', () => {
    it('should return all professionals', async () => {
      const response = [{ id: professionalId }];

      professionalsServiceMock.getAllProfessionals.mockResolvedValue(response);

      const result = await controller.getAllProfessionals();

      expect(result).toBe(response);

      expect(professionalsServiceMock.getAllProfessionals).toHaveBeenCalled();
    });
  });

  describe('getMyProfessionalProfile', () => {
    it('should use the authenticated user id', async () => {
      const response = {
        id: professionalId,
      };

      professionalsServiceMock.getProfessionalByUserId.mockResolvedValue(
        response,
      );

      const request = {
        user: {
          id: userId,
        },
      };

      const result = await controller.getMyProfessionalProfile(request);

      expect(result).toBe(response);

      expect(
        professionalsServiceMock.getProfessionalByUserId,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe('getProfessionalById', () => {
    it('should return the professional', async () => {
      const response = {
        id: professionalId,
      };

      professionalsServiceMock.getProfessionalById.mockResolvedValue(response);

      const result = await controller.getProfessionalById(professionalId);

      expect(result).toBe(response);

      expect(professionalsServiceMock.getProfessionalById).toHaveBeenCalledWith(
        professionalId,
      );
    });
  });

  describe('updateProfessional', () => {
    it('should update the professional', async () => {
      const dto = {
        specialty: 'pedicuría',
      };

      const response = {
        message: 'Profesional actualizado exitosamente',
      };

      professionalsServiceMock.updateProfessional.mockResolvedValue(response);

      const result = await controller.updateProfessional(
        professionalId,
        dto as any,
      );

      expect(result).toBe(response);

      expect(professionalsServiceMock.updateProfessional).toHaveBeenCalledWith(
        professionalId,
        dto,
      );
    });
  });

  describe('softDeleteProfessional', () => {
    it('should deactivate the professional', async () => {
      const response = {
        message: 'Profesional eliminado correctamente',
      };

      professionalsServiceMock.softDeleteProfessional.mockResolvedValue(
        response,
      );

      const result = await controller.softDeleteProfessional(professionalId);

      expect(result).toBe(response);

      expect(
        professionalsServiceMock.softDeleteProfessional,
      ).toHaveBeenCalledWith(professionalId);
    });
  });

  describe('activateProfessional', () => {
    it('should activate the professional', async () => {
      const response = {
        message: 'Profesional activado correctamente',
      };

      professionalsServiceMock.activateProfessional.mockResolvedValue(response);

      const result = await controller.activateProfessional(professionalId);

      expect(result).toBe(response);

      expect(
        professionalsServiceMock.activateProfessional,
      ).toHaveBeenCalledWith(professionalId);
    });
  });

  describe('associateService', () => {
    it('should associate a service with a professional', async () => {
      const response = {
        professionalId,
        serviceId,
      };

      professionalsServiceMock.associateService.mockResolvedValue(response);

      const result = await controller.associateService(
        professionalId,
        serviceId,
      );

      expect(result).toBe(response);

      expect(professionalsServiceMock.associateService).toHaveBeenCalledWith(
        professionalId,
        serviceId,
      );
    });
  });

  describe('getServicesByProfessional', () => {
    it('should return the professional services', async () => {
      const response = [
        {
          professionalId,
          serviceId,
        },
      ];

      professionalsServiceMock.getServicesByProfessional.mockResolvedValue(
        response,
      );

      const result = await controller.getServicesByProfessional(professionalId);

      expect(result).toBe(response);

      expect(
        professionalsServiceMock.getServicesByProfessional,
      ).toHaveBeenCalledWith(professionalId);
    });
  });

  describe('removeServiceFromProfessional', () => {
    it('should remove the service from the professional', async () => {
      const response = {
        message: 'Servicio desvinculado del profesional exitosamente',
      };

      professionalsServiceMock.removeServiceFromProfessional.mockResolvedValue(
        response,
      );

      const result = await controller.removeServiceFromProfessional(
        professionalId,
        serviceId,
      );

      expect(result).toBe(response);

      expect(
        professionalsServiceMock.removeServiceFromProfessional,
      ).toHaveBeenCalledWith(professionalId, serviceId);
    });
  });

  describe('authorization metadata', () => {
    const reflector = new Reflector();

    const ROLES_KEY = 'roles';

    it('should require ADMIN role for createProfessional', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.createProfessional,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for getAllProfessionals', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.getAllProfessionals,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require PROFESSIONAL role for getMyProfessionalProfile', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.getMyProfessionalProfile,
      );

      expect(roles).toEqual([UserRole.PROFESSIONAL]);
    });

    it('should require ADMIN role for getProfessionalById', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.getProfessionalById,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for updateProfessional', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.updateProfessional,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for softDeleteProfessional', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.softDeleteProfessional,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for activateProfessional', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.activateProfessional,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for associateService', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.associateService,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for removeServiceFromProfessional', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ProfessionalsController.prototype.removeServiceFromProfessional,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
