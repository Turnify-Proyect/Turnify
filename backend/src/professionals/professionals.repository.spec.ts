import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProfessionalsRepository } from './professionals.repository';
import { Professional } from './entities/professional.entity';
import { ProfessionalService } from './entities/professional-service.entity';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';

import { UserRole } from 'src/common/userRoles.enum';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

describe('ProfessionalsRepository', () => {
  let repository: ProfessionalsRepository;

  let professionalsRepository: jest.Mocked<Repository<Professional>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let professionalServicesRepository: jest.Mocked<
    Repository<ProfessionalService>
  >;
  let servicesRepository: jest.Mocked<Repository<Service>>;

  beforeEach(async () => {
    const mockProfessionalsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockUsersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockProfessionalServicesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockServicesRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsRepository,
        {
          provide: getRepositoryToken(Professional),
          useValue: mockProfessionalsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(ProfessionalService),
          useValue: mockProfessionalServicesRepository,
        },
        {
          provide: getRepositoryToken(Service),
          useValue: mockServicesRepository,
        },
      ],
    }).compile();

    repository = module.get<ProfessionalsRepository>(ProfessionalsRepository);

    professionalsRepository = module.get(getRepositoryToken(Professional));

    usersRepository = module.get(getRepositoryToken(User));

    professionalServicesRepository = module.get(
      getRepositoryToken(ProfessionalService),
    );

    servicesRepository = module.get(getRepositoryToken(Service));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveProfessionals', () => {
    it('should return active professionals with relations', async () => {
      const professionals = [
        {
          id: 'professional-1',
          isActive: true,
        },
      ] as Professional[];

      professionalsRepository.find.mockResolvedValue(professionals);

      const result = await repository.getActiveProfessionals();

      expect(result).toEqual(professionals);

      expect(professionalsRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: {
          user: true,
          professionalServices: {
            service: true,
          },
          availabilities: true,
        },
      });
    });
  });

  describe('getAllProfessionals', () => {
    it('should return all professionals with relations', async () => {
      const professionals = [
        {
          id: 'professional-1',
          isActive: true,
        },
        {
          id: 'professional-2',
          isActive: false,
        },
      ] as Professional[];

      professionalsRepository.find.mockResolvedValue(professionals);

      const result = await repository.getAllProfessionals();

      expect(result).toEqual(professionals);

      expect(professionalsRepository.find).toHaveBeenCalledWith({
        relations: {
          user: true,
          professionalServices: {
            service: true,
          },
          availabilities: true,
        },
      });
    });
  });

  describe('getProfessionalById', () => {
    const professionalId = 'professional-1';

    it('should return the professional when it exists', async () => {
      const professional = {
        id: professionalId,
        isActive: true,
      } as Professional;

      professionalsRepository.findOne.mockResolvedValue(professional);

      const result = await repository.getProfessionalById(professionalId);

      expect(result).toEqual(professional);

      expect(professionalsRepository.findOne).toHaveBeenCalledWith({
        where: { id: professionalId },
        relations: {
          user: true,
          professionalServices: {
            service: true,
          },
          availabilities: true,
        },
      });
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getProfessionalById(professionalId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        repository.getProfessionalById(professionalId),
      ).rejects.toThrow('No existe un profesional con el ID proporcionado');
    });
  });

  describe('createProfessional', () => {
    const userId = 'user-1';

    const dto = {
      userId,
      specialty: 'Barbero',
    } as CreateProfessionalDto;

    it('should create a professional and update the user role', async () => {
      const user = {
        id: userId,
        roles: [UserRole.CLIENT],
      } as User;

      const professional = {
        id: 'professional-1',
        specialty: 'Barbero',
        user: {
          id: userId,
        },
      } as Professional;

      const savedProfessional = {
        ...professional,
      } as Professional;

      usersRepository.findOne.mockResolvedValue(user);
      professionalsRepository.findOne.mockResolvedValue(null);

      professionalsRepository.create.mockReturnValue(professional);
      professionalsRepository.save.mockResolvedValue(savedProfessional);
      usersRepository.save.mockResolvedValue(user);

      const result = await repository.createProfessional(dto);

      expect(result).toEqual(savedProfessional);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(professionalsRepository.findOne).toHaveBeenCalledWith({
        where: {
          user: {
            id: userId,
          },
        },
      });

      expect(professionalsRepository.create).toHaveBeenCalledWith({
        specialty: dto.specialty,
        user: {
          id: userId,
        },
      });

      expect(professionalsRepository.save).toHaveBeenCalledWith(professional);

      expect(user.roles).toEqual([UserRole.PROFESSIONAL]);

      expect(usersRepository.save).toHaveBeenCalledWith(user);
    });

    it('should preserve ADMIN role when converting the user to professional', async () => {
      const user = {
        id: userId,
        roles: [UserRole.CLIENT, UserRole.ADMIN],
      } as User;

      const professional = {
        id: 'professional-1',
        specialty: 'Barbero',
        user: {
          id: userId,
        },
      } as Professional;

      usersRepository.findOne.mockResolvedValue(user);
      professionalsRepository.findOne.mockResolvedValue(null);
      professionalsRepository.create.mockReturnValue(professional);
      professionalsRepository.save.mockResolvedValue(professional);
      usersRepository.save.mockResolvedValue(user);

      await repository.createProfessional(dto);

      expect(user.roles).toContain(UserRole.ADMIN);
      expect(user.roles).toContain(UserRole.PROFESSIONAL);
      expect(user.roles).not.toContain(UserRole.CLIENT);
      expect(usersRepository.save).toHaveBeenCalledWith(user);
    });

    it('should not duplicate PROFESSIONAL role', async () => {
      const user = {
        id: userId,
        roles: [UserRole.PROFESSIONAL],
      } as User;

      const professional = {
        id: 'professional-1',
        specialty: 'Barbero',
        user: {
          id: userId,
        },
      } as Professional;

      usersRepository.findOne.mockResolvedValue(user);
      professionalsRepository.findOne.mockResolvedValue(null);
      professionalsRepository.create.mockReturnValue(professional);
      professionalsRepository.save.mockResolvedValue(professional);
      usersRepository.save.mockResolvedValue(user);

      await repository.createProfessional(dto);

      expect(user.roles).toEqual([UserRole.PROFESSIONAL]);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(repository.createProfessional(dto)).rejects.toThrow(
        NotFoundException,
      );

      await expect(repository.createProfessional(dto)).rejects.toThrow(
        'No existe un usuario con el ID proporcionado',
      );

      expect(professionalsRepository.create).not.toHaveBeenCalled();
      expect(professionalsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user already has a professional', async () => {
      const user = {
        id: userId,
        roles: [UserRole.CLIENT],
      } as User;

      const existingProfessional = {
        id: 'professional-existing',
      } as Professional;

      usersRepository.findOne.mockResolvedValue(user);
      professionalsRepository.findOne.mockResolvedValue(existingProfessional);

      await expect(repository.createProfessional(dto)).rejects.toThrow(
        ConflictException,
      );

      await expect(repository.createProfessional(dto)).rejects.toThrow(
        'Ya existe un profesional para este usuario',
      );

      expect(professionalsRepository.create).not.toHaveBeenCalled();
      expect(professionalsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateProfessional', () => {
    const professionalId = 'professional-1';

    const dto = {
      specialty: 'Peluquería',
    } as UpdateProfessionalDto;

    it('should update an existing professional', async () => {
      const professional = {
        id: professionalId,
      } as Professional;

      professionalsRepository.findOne.mockResolvedValue(professional);
      professionalsRepository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const result = await repository.updateProfessional(professionalId, dto);

      expect(result).toEqual({
        message: 'Profesional actualizado exitosamente',
      });

      expect(professionalsRepository.findOne).toHaveBeenCalledWith({
        where: { id: professionalId },
      });

      expect(professionalsRepository.update).toHaveBeenCalledWith(
        professionalId,
        dto,
      );
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.updateProfessional(professionalId, dto),
      ).rejects.toThrow(NotFoundException);

      expect(professionalsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteProfessional', () => {
    const professionalId = 'professional-1';

    it('should deactivate an existing professional', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: true,
      } as Professional);

      professionalsRepository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const result = await repository.softDeleteProfessional(professionalId);

      expect(result).toEqual({
        message: 'Profesional eliminado correctamente',
      });

      expect(professionalsRepository.update).toHaveBeenCalledWith(
        professionalId,
        { isActive: false },
      );
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.softDeleteProfessional(professionalId),
      ).rejects.toThrow(NotFoundException);

      expect(professionalsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('activateProfessional', () => {
    const professionalId = 'professional-1';

    it('should activate an inactive professional', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: false,
      } as Professional);

      professionalsRepository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const result = await repository.activateProfessional(professionalId);

      expect(result).toEqual({
        message: 'Profesional activado correctamente',
      });

      expect(professionalsRepository.update).toHaveBeenCalledWith(
        professionalId,
        { isActive: true },
      );
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.activateProfessional(professionalId),
      ).rejects.toThrow(NotFoundException);

      expect(professionalsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when professional is already active', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: true,
      } as Professional);

      await expect(
        repository.activateProfessional(professionalId),
      ).rejects.toThrow(ConflictException);

      await expect(
        repository.activateProfessional(professionalId),
      ).rejects.toThrow('El profesional ya está activo');

      expect(professionalsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('associateService', () => {
    const professionalId = 'professional-1';
    const serviceId = 'service-1';

    it('should associate an active service with an active professional', async () => {
      const professional = {
        id: professionalId,
        isActive: true,
      } as Professional;

      const service = {
        id: serviceId,
        isActive: true,
      } as Service;

      const professionalService = {
        professionalId,
        serviceId,
        professional,
        service,
      } as ProfessionalService;

      professionalsRepository.findOne.mockResolvedValue(professional);
      servicesRepository.findOne.mockResolvedValue(service);
      professionalServicesRepository.findOne.mockResolvedValue(null);
      professionalServicesRepository.create.mockReturnValue(
        professionalService,
      );
      professionalServicesRepository.save.mockResolvedValue(
        professionalService,
      );

      const result = await repository.associateService(
        professionalId,
        serviceId,
      );

      expect(result).toEqual(professionalService);

      expect(professionalServicesRepository.create).toHaveBeenCalledWith({
        professionalId,
        serviceId,
        professional,
        service,
      });

      expect(professionalServicesRepository.save).toHaveBeenCalledWith(
        professionalService,
      );
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow(NotFoundException);

      expect(servicesRepository.findOne).not.toHaveBeenCalled();
      expect(professionalServicesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when professional is inactive', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: false,
      } as Professional);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow(ConflictException);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow(
        'No se pueden asociar servicios a un profesional inactivo',
      );

      expect(servicesRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when service does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: true,
      } as Professional);

      servicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow(NotFoundException);

      expect(professionalServicesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when service is inactive', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: true,
      } as Professional);

      servicesRepository.findOne.mockResolvedValue({
        id: serviceId,
        isActive: false,
      } as Service);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow(ConflictException);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow('No se puede asociar un servicio inactivo');

      expect(professionalServicesRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when association already exists', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
        isActive: true,
      } as Professional);

      servicesRepository.findOne.mockResolvedValue({
        id: serviceId,
        isActive: true,
      } as Service);

      professionalServicesRepository.findOne.mockResolvedValue({
        professionalId,
        serviceId,
      } as ProfessionalService);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow(ConflictException);

      await expect(
        repository.associateService(professionalId, serviceId),
      ).rejects.toThrow('El servicio ya se encuentra asociado al profesional');

      expect(professionalServicesRepository.create).not.toHaveBeenCalled();

      expect(professionalServicesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getServicesByProfessional', () => {
    const professionalId = 'professional-1';

    it('should return services associated with a professional', async () => {
      const professional = {
        id: professionalId,
      } as Professional;

      const associations = [
        {
          professionalId,
          serviceId: 'service-1',
        },
        {
          professionalId,
          serviceId: 'service-2',
        },
      ] as ProfessionalService[];

      professionalsRepository.findOne.mockResolvedValue(professional);
      professionalServicesRepository.find.mockResolvedValue(associations);

      const result = await repository.getServicesByProfessional(professionalId);

      expect(result).toEqual(associations);

      expect(professionalServicesRepository.find).toHaveBeenCalledWith({
        where: { professionalId },
        relations: {
          service: true,
        },
      });
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getServicesByProfessional(professionalId),
      ).rejects.toThrow(NotFoundException);

      expect(professionalServicesRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('removeServiceFromProfessional', () => {
    const professionalId = 'professional-1';
    const serviceId = 'service-1';

    it('should remove an existing association', async () => {
      const professional = {
        id: professionalId,
      } as Professional;

      const service = {
        id: serviceId,
      } as Service;

      const association = {
        professionalId,
        serviceId,
      } as ProfessionalService;

      professionalsRepository.findOne.mockResolvedValue(professional);
      servicesRepository.findOne.mockResolvedValue(service);
      professionalServicesRepository.findOne.mockResolvedValue(association);
      professionalServicesRepository.remove.mockResolvedValue(association);

      const result = await repository.removeServiceFromProfessional(
        professionalId,
        serviceId,
      );

      expect(result).toEqual({
        message: 'Servicio desvinculado del profesional exitosamente',
      });

      expect(professionalServicesRepository.remove).toHaveBeenCalledWith(
        association,
      );
    });

    it('should throw NotFoundException when professional does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.removeServiceFromProfessional(professionalId, serviceId),
      ).rejects.toThrow(NotFoundException);

      expect(servicesRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when service does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
      } as Professional);

      servicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.removeServiceFromProfessional(professionalId, serviceId),
      ).rejects.toThrow(NotFoundException);

      expect(professionalServicesRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when association does not exist', async () => {
      professionalsRepository.findOne.mockResolvedValue({
        id: professionalId,
      } as Professional);

      servicesRepository.findOne.mockResolvedValue({
        id: serviceId,
      } as Service);

      professionalServicesRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.removeServiceFromProfessional(professionalId, serviceId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        repository.removeServiceFromProfessional(professionalId, serviceId),
      ).rejects.toThrow('El servicio no se encuentra asociado al profesional');

      expect(professionalServicesRepository.remove).not.toHaveBeenCalled();
    });
  });
});
