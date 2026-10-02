import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtService } from '@nestjs/jwt';


describe('ProfessionalsController', () => {
  let controller: ProfessionalsController;
  let service: jest.Mocked<ProfessionalsService>;

  beforeEach(async () => {
    const mockProfessionalsService = {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionalsController],
      providers: [
        {
          provide: ProfessionalsService,
          useValue: mockProfessionalsService,
        },
        {
          provide: JwtService,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<ProfessionalsController>(ProfessionalsController);
    service = module.get(ProfessionalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfessional', () => {
    it('should create a professional', async () => {
      const dto = {
        name: 'Juan Pérez',
      } as CreateProfessionalDto;

      const expectedResult = {
        id: 'professional-1',
        ...dto,
      };

      service.createProfessional.mockResolvedValue(expectedResult as any);

      const result = await controller.createProfessional(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createProfessional).toHaveBeenCalledWith(dto);
      expect(service.createProfessional).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveProfessionals', () => {
    it('should return active professionals', async () => {
      const expectedResult = [
        {
          id: 'professional-1',
          name: 'Juan Pérez',
        },
        {
          id: 'professional-2',
          name: 'María López',
        },
      ];

      service.getActiveProfessionals.mockResolvedValue(expectedResult as any);

      const result = await controller.getActiveProfessionals();

      expect(result).toEqual(expectedResult);
      expect(service.getActiveProfessionals).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllProfessionals', () => {
    it('should return all professionals', async () => {
      const expectedResult = [
        {
          id: 'professional-1',
          name: 'Juan Pérez',
          active: true,
        },
        {
          id: 'professional-2',
          name: 'María López',
          active: false,
        },
      ];

      service.getAllProfessionals.mockResolvedValue(expectedResult as any);

      const result = await controller.getAllProfessionals();

      expect(result).toEqual(expectedResult);
      expect(service.getAllProfessionals).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProfessionalById', () => {
    it('should return a professional by id', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';

      const expectedResult = {
        id: professionalId,
        name: 'Juan Pérez',
      };

      service.getProfessionalById.mockResolvedValue(expectedResult as any);

      const result = await controller.getProfessionalById(professionalId);

      expect(result).toEqual(expectedResult);
      expect(service.getProfessionalById).toHaveBeenCalledWith(
        professionalId,
      );
      expect(service.getProfessionalById).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProfessional', () => {
    it('should update a professional', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';

      const dto = {
        name: 'Juan Pérez Actualizado',
      } as UpdateProfessionalDto;

      const expectedResult = {
        id: professionalId,
        name: 'Juan Pérez Actualizado',
      };

      service.updateProfessional.mockResolvedValue(expectedResult as any);

      const result = await controller.updateProfessional(
        professionalId,
        dto,
      );

      expect(result).toEqual(expectedResult);
      expect(service.updateProfessional).toHaveBeenCalledWith(
        professionalId,
        dto,
      );
      expect(service.updateProfessional).toHaveBeenCalledTimes(1);
    });
  });

  describe('softDeleteProfessional', () => {
    it('should soft delete a professional', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';

      const expectedResult = {
        id: professionalId,
        active: false,
      };

      service.softDeleteProfessional.mockResolvedValue(expectedResult as any);

      const result =
        await controller.softDeleteProfessional(professionalId);

      expect(result).toEqual(expectedResult);
      expect(service.softDeleteProfessional).toHaveBeenCalledWith(
        professionalId,
      );
      expect(service.softDeleteProfessional).toHaveBeenCalledTimes(1);
    });
  });

  describe('activateProfessional', () => {
    it('should activate a professional', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';

      const expectedResult = {
        id: professionalId,
        active: true,
      };

      service.activateProfessional.mockResolvedValue(expectedResult as any);

      const result =
        await controller.activateProfessional(professionalId);

      expect(result).toEqual(expectedResult);
      expect(service.activateProfessional).toHaveBeenCalledWith(
        professionalId,
      );
      expect(service.activateProfessional).toHaveBeenCalledTimes(1);
    });
  });

  describe('associateService', () => {
    it('should associate a service with a professional', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';
      const serviceId = '650e8400-e29b-41d4-a716-446655440000';

      const expectedResult = {
        professionalId,
        serviceId,
      };

      service.associateService.mockResolvedValue(expectedResult as any);

      const result = await controller.associateService(
        professionalId,
        serviceId,
      );

      expect(result).toEqual(expectedResult);
      expect(service.associateService).toHaveBeenCalledWith(
        professionalId,
        serviceId,
      );
      expect(service.associateService).toHaveBeenCalledTimes(1);
    });
  });

  describe('getServicesByProfessional', () => {
    it('should return services associated with a professional', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';

      const expectedResult = [
        {
          id: 'service-1',
          name: 'Corte de cabello',
        },
        {
          id: 'service-2',
          name: 'Barba',
        },
      ];

      service.getServicesByProfessional.mockResolvedValue(
        expectedResult as any,
      );

      const result =
        await controller.getServicesByProfessional(professionalId);

      expect(result).toEqual(expectedResult);
      expect(service.getServicesByProfessional).toHaveBeenCalledWith(
        professionalId,
      );
      expect(service.getServicesByProfessional).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeServiceFromProfessional', () => {
    it('should remove a service from a professional', async () => {
      const professionalId = '550e8400-e29b-41d4-a716-446655440000';
      const serviceId = '650e8400-e29b-41d4-a716-446655440000';

      const expectedResult = {
        professionalId,
        serviceId,
      };

      service.removeServiceFromProfessional.mockResolvedValue(
        expectedResult as any,
      );

      const result = await controller.removeServiceFromProfessional(
        professionalId,
        serviceId,
      );

      expect(result).toEqual(expectedResult);
      expect(
        service.removeServiceFromProfessional,
      ).toHaveBeenCalledWith(professionalId, serviceId);
      expect(
        service.removeServiceFromProfessional,
      ).toHaveBeenCalledTimes(1);
    });
  });
});