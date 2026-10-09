import { ForbiddenException } from '@nestjs/common';
import { ProfessionalUnavailabilityController } from './professional-unavailability.controller';
import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { UserRole } from '../common/userRoles.enum';

describe('ProfessionalUnavailabilityController', () => {
  let controller: ProfessionalUnavailabilityController;

  let professionalUnavailabilityService: {
    getByProfessionalId: jest.Mock;
    create: jest.Mock;
    getById: jest.Mock;
    delete: jest.Mock;
  };

  let professionalsService: {
    getProfessionalByUserId: jest.Mock;
  };

  const professionalId = 'professional-uuid';
  const otherProfessionalId = 'other-professional-uuid';
  const userId = 'user-uuid';
  const unavailabilityId = 'unavailability-uuid';

  const unavailability = {
    id: unavailabilityId,
    professional: {
      id: professionalId,
    },
  };

  beforeEach(() => {
    professionalUnavailabilityService = {
      getByProfessionalId: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
    };

    professionalsService = {
      getProfessionalByUserId: jest.fn(),
    };

    controller = new ProfessionalUnavailabilityController(
      professionalUnavailabilityService as unknown as ProfessionalUnavailabilityService,
      professionalsService as unknown as ProfessionalsService,
    );
  });

  describe('getByProfessionalId', () => {
    it('should return the professional unavailabilities', async () => {
      const blocks = [
        {
          id: 'block-1',
          professional: {
            id: professionalId,
          },
        },
        {
          id: 'block-2',
          professional: {
            id: professionalId,
          },
        },
      ];

      professionalUnavailabilityService.getByProfessionalId.mockResolvedValue(
        blocks,
      );

      const result = await controller.getByProfessionalId(professionalId);

      expect(
        professionalUnavailabilityService.getByProfessionalId,
      ).toHaveBeenCalledWith(professionalId);

      expect(result).toEqual(blocks);
    });

    it('should return an empty array when there are no blocks', async () => {
      professionalUnavailabilityService.getByProfessionalId.mockResolvedValue(
        [],
      );

      const result = await controller.getByProfessionalId(professionalId);

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');

      professionalUnavailabilityService.getByProfessionalId.mockRejectedValue(
        error,
      );

      await expect(
        controller.getByProfessionalId(professionalId),
      ).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const createData = {
      date: '2026-10-10',
      startTime: '09:00',
      endTime: '12:00',
    };

    it('should allow an admin to create a block for any professional', async () => {
      const adminRequest = {
        user: {
          id: userId,
          roles: [UserRole.ADMIN],
        },
      };

      const createdBlock = {
        id: unavailabilityId,
        professional: {
          id: professionalId,
        },
        ...createData,
      };

      professionalUnavailabilityService.create.mockResolvedValue(createdBlock);

      const result = await controller.create(
        professionalId,
        createData as any,
        adminRequest,
      );

      expect(
        professionalsService.getProfessionalByUserId,
      ).not.toHaveBeenCalled();

      expect(professionalUnavailabilityService.create).toHaveBeenCalledWith(
        professionalId,
        createData,
      );

      expect(result).toEqual(createdBlock);
    });

    it('should allow a professional to create a block for their own professional profile', async () => {
      const professionalRequest = {
        user: {
          id: userId,
          roles: [UserRole.PROFESSIONAL],
        },
      };

      const professional = {
        id: professionalId,
      };

      const createdBlock = {
        id: unavailabilityId,
        professional,
        ...createData,
      };

      professionalsService.getProfessionalByUserId.mockResolvedValue(
        professional,
      );

      professionalUnavailabilityService.create.mockResolvedValue(createdBlock);

      const result = await controller.create(
        professionalId,
        createData as any,
        professionalRequest,
      );

      expect(professionalsService.getProfessionalByUserId).toHaveBeenCalledWith(
        userId,
      );

      expect(professionalUnavailabilityService.create).toHaveBeenCalledWith(
        professionalId,
        createData,
      );

      expect(result).toEqual(createdBlock);
    });

    it('should reject a professional trying to create a block for another professional', async () => {
      const professionalRequest = {
        user: {
          id: userId,
          roles: [UserRole.PROFESSIONAL],
        },
      };

      professionalsService.getProfessionalByUserId.mockResolvedValue({
        id: professionalId,
      });

      await expect(
        controller.create(
          otherProfessionalId,
          createData as any,
          professionalRequest,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.create(
          otherProfessionalId,
          createData as any,
          professionalRequest,
        ),
      ).rejects.toThrow(
        'No tenés permiso para crear bloqueos para otro profesional',
      );

      expect(professionalUnavailabilityService.create).not.toHaveBeenCalled();
    });

    it('should not perform ownership validation for a non-professional role', async () => {
      const clientRequest = {
        user: {
          id: userId,
          roles: [UserRole.CLIENT],
        },
      };

      professionalUnavailabilityService.create.mockResolvedValue(
        unavailability,
      );

      const result = await controller.create(
        professionalId,
        createData as any,
        clientRequest,
      );

      expect(
        professionalsService.getProfessionalByUserId,
      ).not.toHaveBeenCalled();

      expect(professionalUnavailabilityService.create).toHaveBeenCalledWith(
        professionalId,
        createData,
      );

      expect(result).toEqual(unavailability);
    });

    it('should propagate errors from ProfessionalsService', async () => {
      const professionalRequest = {
        user: {
          id: userId,
          roles: [UserRole.PROFESSIONAL],
        },
      };

      const error = new Error('Professional not found');

      professionalsService.getProfessionalByUserId.mockRejectedValue(error);

      await expect(
        controller.create(
          professionalId,
          createData as any,
          professionalRequest,
        ),
      ).rejects.toThrow(error);

      expect(professionalUnavailabilityService.create).not.toHaveBeenCalled();
    });

    it('should propagate errors from ProfessionalUnavailabilityService', async () => {
      const adminRequest = {
        user: {
          id: userId,
          roles: [UserRole.ADMIN],
        },
      };

      const error = new Error('Create error');

      professionalUnavailabilityService.create.mockRejectedValue(error);

      await expect(
        controller.create(professionalId, createData as any, adminRequest),
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should allow an admin to delete any professional block', async () => {
      const adminRequest = {
        user: {
          id: userId,
          roles: [UserRole.ADMIN],
        },
      };

      professionalUnavailabilityService.getById.mockResolvedValue(
        unavailability,
      );

      professionalUnavailabilityService.delete.mockResolvedValue(undefined);

      await expect(
        controller.delete(unavailabilityId, adminRequest),
      ).resolves.toBeUndefined();

      expect(professionalUnavailabilityService.getById).toHaveBeenCalledWith(
        unavailabilityId,
      );

      expect(
        professionalsService.getProfessionalByUserId,
      ).not.toHaveBeenCalled();

      expect(professionalUnavailabilityService.delete).toHaveBeenCalledWith(
        unavailabilityId,
      );
    });

    it('should allow a professional to delete their own block', async () => {
      const professionalRequest = {
        user: {
          id: userId,
          roles: [UserRole.PROFESSIONAL],
        },
      };

      professionalUnavailabilityService.getById.mockResolvedValue(
        unavailability,
      );

      professionalsService.getProfessionalByUserId.mockResolvedValue({
        id: professionalId,
      });

      professionalUnavailabilityService.delete.mockResolvedValue(undefined);

      await expect(
        controller.delete(unavailabilityId, professionalRequest),
      ).resolves.toBeUndefined();

      expect(professionalUnavailabilityService.getById).toHaveBeenCalledWith(
        unavailabilityId,
      );

      expect(professionalsService.getProfessionalByUserId).toHaveBeenCalledWith(
        userId,
      );

      expect(professionalUnavailabilityService.delete).toHaveBeenCalledWith(
        unavailabilityId,
      );
    });

    it('should reject a professional trying to delete another professional block', async () => {
      const professionalRequest = {
        user: {
          id: userId,
          roles: [UserRole.PROFESSIONAL],
        },
      };

      professionalUnavailabilityService.getById.mockResolvedValue(
        unavailability,
      );

      professionalsService.getProfessionalByUserId.mockResolvedValue({
        id: otherProfessionalId,
      });

      await expect(
        controller.delete(unavailabilityId, professionalRequest),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.delete(unavailabilityId, professionalRequest),
      ).rejects.toThrow(
        'No tenés permiso para eliminar bloqueos de otro profesional',
      );

      expect(professionalUnavailabilityService.delete).not.toHaveBeenCalled();
    });

    it('should propagate errors when getting the block', async () => {
      const adminRequest = {
        user: {
          id: userId,
          roles: [UserRole.ADMIN],
        },
      };

      const error = new Error('Block not found');

      professionalUnavailabilityService.getById.mockRejectedValue(error);

      await expect(
        controller.delete(unavailabilityId, adminRequest),
      ).rejects.toThrow(error);

      expect(professionalUnavailabilityService.delete).not.toHaveBeenCalled();
    });

    it('should propagate errors from ProfessionalsService during delete', async () => {
      const professionalRequest = {
        user: {
          id: userId,
          roles: [UserRole.PROFESSIONAL],
        },
      };

      professionalUnavailabilityService.getById.mockResolvedValue(
        unavailability,
      );

      const error = new Error('Professional lookup error');

      professionalsService.getProfessionalByUserId.mockRejectedValue(error);

      await expect(
        controller.delete(unavailabilityId, professionalRequest),
      ).rejects.toThrow(error);

      expect(professionalUnavailabilityService.delete).not.toHaveBeenCalled();
    });

    it('should propagate errors from delete service', async () => {
      const adminRequest = {
        user: {
          id: userId,
          roles: [UserRole.ADMIN],
        },
      };

      professionalUnavailabilityService.getById.mockResolvedValue(
        unavailability,
      );

      const error = new Error('Delete error');

      professionalUnavailabilityService.delete.mockRejectedValue(error);

      await expect(
        controller.delete(unavailabilityId, adminRequest),
      ).rejects.toThrow(error);
    });
  });
});
