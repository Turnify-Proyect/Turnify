import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';
import {
  ProfessionalSpecialty,
} from './entities/professional.entity';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;

  let professionalsRepositoryMock: {
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

    professionalsRepositoryMock = {
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

    service = new ProfessionalsService(
      professionalsRepositoryMock as unknown as ProfessionalsRepository,
    );
  });

  describe('createProfessional', () => {
    it('should delegate to the repository', async () => {
      const dto = {
        userId,
        specialty: ProfessionalSpecialty.MASAJES,
      };

      const professional = {
        id: professionalId,
      };

      professionalsRepositoryMock.createProfessional.mockResolvedValue(
        professional,
      );

      const result =
        await service.createProfessional(dto);

      expect(result).toBe(professional);

      expect(
        professionalsRepositoryMock.createProfessional,
      ).toHaveBeenCalledWith(dto);
    });
  });

  describe('getActiveProfessionals', () => {
    it('should delegate to the repository', async () => {
      const professionals = [
        { id: professionalId },
      ];

      professionalsRepositoryMock.getActiveProfessionals.mockResolvedValue(
        professionals,
      );

      const result =
        await service.getActiveProfessionals();

      expect(result).toBe(professionals);

      expect(
        professionalsRepositoryMock.getActiveProfessionals,
      ).toHaveBeenCalled();
    });
  });

  describe('getAllProfessionals', () => {
    it('should delegate to the repository', async () => {
      const professionals = [
        { id: professionalId },
      ];

      professionalsRepositoryMock.getAllProfessionals.mockResolvedValue(
        professionals,
      );

      const result =
        await service.getAllProfessionals();

      expect(result).toBe(professionals);

      expect(
        professionalsRepositoryMock.getAllProfessionals,
      ).toHaveBeenCalled();
    });
  });

  describe('getProfessionalById', () => {
    it('should delegate to the repository', async () => {
      const professional = {
        id: professionalId,
      };

      professionalsRepositoryMock.getProfessionalById.mockResolvedValue(
        professional,
      );

      const result =
        await service.getProfessionalById(
          professionalId,
        );

      expect(result).toBe(professional);

      expect(
        professionalsRepositoryMock.getProfessionalById,
      ).toHaveBeenCalledWith(
        professionalId,
      );
    });
  });

  describe('getProfessionalByUserId', () => {
    it('should delegate to the repository', async () => {
      const professional = {
        id: professionalId,
      };

      professionalsRepositoryMock.getProfessionalByUserId.mockResolvedValue(
        professional,
      );

      const result =
        await service.getProfessionalByUserId(userId);

      expect(result).toBe(professional);

      expect(
        professionalsRepositoryMock.getProfessionalByUserId,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfessional', () => {
    it('should delegate to the repository', async () => {
      const dto = {
        specialty: ProfessionalSpecialty.PEDICURIA,
      };

      const response = {
        message:
          'Profesional actualizado exitosamente',
      };

      professionalsRepositoryMock.updateProfessional.mockResolvedValue(
        response,
      );

      const result =
        await service.updateProfessional(
          professionalId,
          dto,
        );

      expect(result).toBe(response);

      expect(
        professionalsRepositoryMock.updateProfessional,
      ).toHaveBeenCalledWith(
        professionalId,
        dto,
      );
    });
  });

  describe('softDeleteProfessional', () => {
    it('should delegate to the repository', async () => {
      const response = {
        message:
          'Profesional eliminado correctamente',
      };

      professionalsRepositoryMock.softDeleteProfessional.mockResolvedValue(
        response,
      );

      const result =
        await service.softDeleteProfessional(
          professionalId,
        );

      expect(result).toBe(response);

      expect(
        professionalsRepositoryMock.softDeleteProfessional,
      ).toHaveBeenCalledWith(
        professionalId,
      );
    });
  });

  describe('activateProfessional', () => {
    it('should delegate to the repository', async () => {
      const response = {
        message:
          'Profesional activado correctamente',
      };

      professionalsRepositoryMock.activateProfessional.mockResolvedValue(
        response,
      );

      const result =
        await service.activateProfessional(
          professionalId,
        );

      expect(result).toBe(response);

      expect(
        professionalsRepositoryMock.activateProfessional,
      ).toHaveBeenCalledWith(
        professionalId,
      );
    });
  });

  describe('associateService', () => {
    it('should delegate to the repository', async () => {
      const professionalService = {
        professionalId,
        serviceId,
      };

      professionalsRepositoryMock.associateService.mockResolvedValue(
        professionalService,
      );

      const result =
        await service.associateService(
          professionalId,
          serviceId,
        );

      expect(result).toBe(professionalService);

      expect(
        professionalsRepositoryMock.associateService,
      ).toHaveBeenCalledWith(
        professionalId,
        serviceId,
      );
    });
  });

  describe('getServicesByProfessional', () => {
    it('should delegate to the repository', async () => {
      const services = [
        {
          professionalId,
          serviceId,
        },
      ];

      professionalsRepositoryMock.getServicesByProfessional.mockResolvedValue(
        services,
      );

      const result =
        await service.getServicesByProfessional(
          professionalId,
        );

      expect(result).toBe(services);

      expect(
        professionalsRepositoryMock.getServicesByProfessional,
      ).toHaveBeenCalledWith(
        professionalId,
      );
    });
  });

  describe('removeServiceFromProfessional', () => {
    it('should delegate to the repository', async () => {
      const response = {
        message:
          'Servicio desvinculado del profesional exitosamente',
      };

      professionalsRepositoryMock.removeServiceFromProfessional.mockResolvedValue(
        response,
      );

      const result =
        await service.removeServiceFromProfessional(
          professionalId,
          serviceId,
        );

      expect(result).toBe(response);

      expect(
        professionalsRepositoryMock.removeServiceFromProfessional,
      ).toHaveBeenCalledWith(
        professionalId,
        serviceId,
      );
    });
  });
});
