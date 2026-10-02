import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let repository: jest.Mocked<ProfessionalsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        {
          provide: ProfessionalsRepository,
          useValue: {
            createProfessional: jest.fn(),
            getActiveProfessionals: jest.fn(),
            getAllProfessionals: jest.fn(),
            getProfessionalById: jest.fn(),
            updateProfessional: jest.fn(),
            softDeleteProfessional: jest.fn(),
            activateProfessional: jest.fn(),
            associateService: jest.fn(),
            getServicesByProfessional: jest.fn(),
            removeServiceFromProfessional: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfessionalsService>(ProfessionalsService);
    repository = module.get(ProfessionalsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfessional', () => {
    it('should create a professional using the repository', async () => {
      const dto: CreateProfessionalDto = {
        userId: 'user-id',
        specialty: 'Barbero',
      };

      const expectedResult = {
        id: 'professional-id',
        specialty: 'Barbero',
      };

      repository.createProfessional.mockResolvedValue(expectedResult as any);

      const result = await service.createProfessional(dto);

      expect(repository.createProfessional).toHaveBeenCalledWith(dto);
      expect(repository.createProfessional).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getActiveProfessionals', () => {
    it('should return active professionals from the repository', async () => {
      const expectedResult = [
        {
          id: 'professional-1',
          specialty: 'Barbero',
          isActive: true,
        },
        {
          id: 'professional-2',
          specialty: 'Peluquero',
          isActive: true,
        },
      ];

      repository.getActiveProfessionals.mockResolvedValue(
        expectedResult as any,
      );

      const result = await service.getActiveProfessionals();

      expect(repository.getActiveProfessionals).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllProfessionals', () => {
    it('should return all professionals from the repository', async () => {
      const expectedResult = [
        {
          id: 'professional-1',
          isActive: true,
        },
        {
          id: 'professional-2',
          isActive: false,
        },
      ];

      repository.getAllProfessionals.mockResolvedValue(expectedResult as any);

      const result = await service.getAllProfessionals();

      expect(repository.getAllProfessionals).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfessionalById', () => {
    it('should return the professional with the specified id', async () => {
      const id = 'professional-id';

      const expectedResult = {
        id,
        specialty: 'Barbero',
        isActive: true,
      };

      repository.getProfessionalById.mockResolvedValue(expectedResult as any);

      const result = await service.getProfessionalById(id);

      expect(repository.getProfessionalById).toHaveBeenCalledWith(id);
      expect(repository.getProfessionalById).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateProfessional', () => {
    it('should update the professional using the repository', async () => {
      const id = 'professional-id';

      const dto: UpdateProfessionalDto = {
        specialty: 'Peluquero',
      };

      const expectedResult = {
        message: 'Profesional actualizado exitosamente',
      };

      repository.updateProfessional.mockResolvedValue(expectedResult);

      const result = await service.updateProfessional(id, dto);

      expect(repository.updateProfessional).toHaveBeenCalledWith(id, dto);
      expect(repository.updateProfessional).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('softDeleteProfessional', () => {
    it('should soft delete the professional using the repository', async () => {
      const id = 'professional-id';

      const expectedResult = {
        message: 'Profesional eliminado correctamente',
      };

      repository.softDeleteProfessional.mockResolvedValue(expectedResult);

      const result = await service.softDeleteProfessional(id);

      expect(repository.softDeleteProfessional).toHaveBeenCalledWith(id);
      expect(repository.softDeleteProfessional).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('activateProfessional', () => {
    it('should activate the professional using the repository', async () => {
      const id = 'professional-id';

      const expectedResult = {
        message: 'Profesional activado correctamente',
      };

      repository.activateProfessional.mockResolvedValue(expectedResult);

      const result = await service.activateProfessional(id);

      expect(repository.activateProfessional).toHaveBeenCalledWith(id);
      expect(repository.activateProfessional).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('associateService', () => {
    it('should associate a service with a professional', async () => {
      const professionalId = 'professional-id';
      const serviceId = 'service-id';

      const expectedResult = {
        professionalId,
        serviceId,
      };

      repository.associateService.mockResolvedValue(expectedResult as any);

      const result = await service.associateService(
        professionalId,
        serviceId,
      );

      expect(repository.associateService).toHaveBeenCalledWith(
        professionalId,
        serviceId,
      );
      expect(repository.associateService).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getServicesByProfessional', () => {
    it('should return services associated with a professional', async () => {
      const professionalId = 'professional-id';

      const expectedResult = [
        {
          professionalId,
          serviceId: 'service-1',
        },
        {
          professionalId,
          serviceId: 'service-2',
        },
      ];

      repository.getServicesByProfessional.mockResolvedValue(
        expectedResult as any,
      );

      const result =
        await service.getServicesByProfessional(professionalId);

      expect(repository.getServicesByProfessional).toHaveBeenCalledWith(
        professionalId,
      );
      expect(repository.getServicesByProfessional).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('removeServiceFromProfessional', () => {
    it('should remove a service from a professional', async () => {
      const professionalId = 'professional-id';
      const serviceId = 'service-id';

      const expectedResult = {
        message: 'Servicio desvinculado del profesional exitosamente',
      };

      repository.removeServiceFromProfessional.mockResolvedValue(
        expectedResult,
      );

      const result = await service.removeServiceFromProfessional(
        professionalId,
        serviceId,
      );

      expect(repository.removeServiceFromProfessional).toHaveBeenCalledWith(
        professionalId,
        serviceId,
      );
      expect(repository.removeServiceFromProfessional).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
