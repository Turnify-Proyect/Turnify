import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProfessionalsRepository } from './professionals.repository';
import { Professional } from './entities/professional.entity';
import {
  ProfessionalSpecialty,
} from './entities/professional.entity';
import { ProfessionalService } from './entities/professional-service.entity';
import { Service } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/userRoles.enum';

describe('ProfessionalsRepository', () => {
  let repository: ProfessionalsRepository;

  let professionalsRepositoryMock: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  let usersRepositoryMock: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  let professionalServicesRepositoryMock: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  let servicesRepositoryMock: {
    findOne: jest.Mock;
  };

  const userId = 'user-123';
  const professionalId = 'professional-123';
  const serviceId = 'service-123';

  const createUser = (
    overrides: Partial<User> = {},
  ): User => {
    return {
      id: userId,
      name: 'Juan Pérez',
      email: 'juan@test.com',
      isEmailVerified: true,
      password_hash: null,
      phone: '3415555555',
      roles: [UserRole.CLIENT],
      isActive: true,
      authProvider: {} as any,
      providerId: null,
      country: 'Argentina',
      address: 'Calle 123',
      city: 'Rosario',
      imgUrl: null,
      appointments: [],
      professionalProfile: null,
      emailVerificationTokens: [],
      passwordResetTokens: [],
      ...overrides,
    };
  };

  const createProfessional = (
    overrides: Partial<Professional> = {},
  ): Professional => {
    return {
      id: professionalId,
      user: createUser({
        roles: [UserRole.PROFESSIONAL],
      }),
      specialty: ProfessionalSpecialty.MASAJES,
      isActive: true,
      appointments: [],
      professionalServices: [],
      availabilities: [],
      ...overrides,
    };
  };

  const createService = (
    overrides: Partial<Service> = {},
  ): Service => {
    return {
      id: serviceId,
      name: 'Masajes',
      description: 'Servicio de masajes',
      category: {} as any,
      price: '5000',
      durationMinutes: 60,
      imageUrl: null,
      isActive: true,
      appointments: [],
      professionalServices: [],
      ...overrides,
    };
  };

  const createProfessionalService = (
    overrides: Partial<ProfessionalService> = {},
  ): ProfessionalService => {
    return {
      professionalId,
      serviceId,
      professional: createProfessional(),
      service: createService(),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    professionalsRepositoryMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    usersRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    professionalServicesRepositoryMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    servicesRepositoryMock = {
      findOne: jest.fn(),
    };

    repository = new ProfessionalsRepository(
      professionalsRepositoryMock as any,
      usersRepositoryMock as any,
      professionalServicesRepositoryMock as any,
      servicesRepositoryMock as any,
    );
  });

  describe('getActiveProfessionals', () => {
    it('should return active professionals', async () => {
      const professionals = [
        createProfessional(),
        createProfessional({
          id: 'professional-456',
        }),
      ];

      professionalsRepositoryMock.find.mockResolvedValue(
        professionals,
      );

      const result = await repository.getActiveProfessionals();

      expect(result).toBe(professionals);

      expect(
        professionalsRepositoryMock.find,
      ).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
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
    it('should return all professionals', async () => {
      const professionals = [
        createProfessional(),
      ];

      professionalsRepositoryMock.find.mockResolvedValue(
        professionals,
      );

      const result =
        await repository.getAllProfessionals();

      expect(result).toBe(professionals);

      expect(
        professionalsRepositoryMock.find,
      ).toHaveBeenCalledWith({
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
    it('should return the professional when it exists', async () => {
      const professional = createProfessional();

      professionalsRepositoryMock.findOne.mockResolvedValue(
        professional,
      );

      const result =
        await repository.getProfessionalById(
          professionalId,
        );

      expect(result).toBe(professional);

      expect(
        professionalsRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: professionalId,
        },
        relations: {
          user: true,
          professionalServices: {
            service: true,
          },
          availabilities: true,
        },
      });
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.getProfessionalById(
          professionalId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfessionalByUserId', () => {
    it('should return the professional associated with the user', async () => {
      const professional = createProfessional();

      professionalsRepositoryMock.findOne.mockResolvedValue(
        professional,
      );

      const result =
        await repository.getProfessionalByUserId(
          userId,
        );

      expect(result).toBe(professional);

      expect(
        professionalsRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          user: {
            id: userId,
          },
        },
        relations: {
          user: true,
          professionalServices: {
            service: true,
          },
          availabilities: true,
        },
      });
    });

    it('should throw when no professional is associated with the user', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.getProfessionalByUserId(
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProfessional', () => {
    it('should create a professional and update the user role', async () => {
      const user = createUser({
        roles: [UserRole.CLIENT],
      });

      const createdProfessional = createProfessional();

      usersRepositoryMock.findOne.mockResolvedValue(user);

      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      professionalsRepositoryMock.create.mockReturnValue(
        createdProfessional,
      );

      professionalsRepositoryMock.save.mockResolvedValue(
        createdProfessional,
      );

      usersRepositoryMock.save.mockResolvedValue(user);

      const result =
        await repository.createProfessional({
          userId,
          specialty: ProfessionalSpecialty.MASAJES,
        });

      expect(result).toBe(createdProfessional);

      expect(
        usersRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
      });

      expect(
        professionalsRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          user: {
            id: userId,
          },
        },
      });

      expect(
        professionalsRepositoryMock.create,
      ).toHaveBeenCalledWith({
        specialty: ProfessionalSpecialty.MASAJES,
        user: {
          id: userId,
        },
      });

      expect(user.roles).not.toContain(
        UserRole.CLIENT,
      );

      expect(user.roles).toContain(
        UserRole.PROFESSIONAL,
      );

      expect(usersRepositoryMock.save).toHaveBeenCalledWith(
        user,
      );
    });

    it('should preserve the admin role when creating a professional', async () => {
      const user = createUser({
        roles: [
          UserRole.CLIENT,
          UserRole.ADMIN,
        ],
      });

      usersRepositoryMock.findOne.mockResolvedValue(user);

      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      const professional = createProfessional();

      professionalsRepositoryMock.create.mockReturnValue(
        professional,
      );

      professionalsRepositoryMock.save.mockResolvedValue(
        professional,
      );

      usersRepositoryMock.save.mockResolvedValue(user);

      await repository.createProfessional({
        userId,
        specialty: ProfessionalSpecialty.COSMETOLOGIA,
      });

      expect(user.roles).not.toContain(
        UserRole.CLIENT,
      );

      expect(user.roles).toContain(
        UserRole.ADMIN,
      );

      expect(user.roles).toContain(
        UserRole.PROFESSIONAL,
      );
    });

    it('should not duplicate the professional role', async () => {
      const user = createUser({
        roles: [UserRole.PROFESSIONAL],
      });

      usersRepositoryMock.findOne.mockResolvedValue(user);

      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      const professional = createProfessional();

      professionalsRepositoryMock.create.mockReturnValue(
        professional,
      );

      professionalsRepositoryMock.save.mockResolvedValue(
        professional,
      );

      usersRepositoryMock.save.mockResolvedValue(user);

      await repository.createProfessional({
        userId,
        specialty: ProfessionalSpecialty.MANICURIA,
      });

      expect(
        user.roles.filter(
          (role) => role === UserRole.PROFESSIONAL,
        ),
      ).toHaveLength(1);
    });

    it('should throw when the user does not exist', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.createProfessional({
          userId,
          specialty: ProfessionalSpecialty.MASAJES,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(
        professionalsRepositoryMock.create,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the user already has a professional profile', async () => {
      const user = createUser();

      usersRepositoryMock.findOne.mockResolvedValue(user);

      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      await expect(
        repository.createProfessional({
          userId,
          specialty: ProfessionalSpecialty.MASAJES,
        }),
      ).rejects.toThrow(ConflictException);

      expect(
        professionalsRepositoryMock.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateProfessional', () => {
    it('should update the professional', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      professionalsRepositoryMock.update.mockResolvedValue({
        affected: 1,
      });

      const result =
        await repository.updateProfessional(
          professionalId,
          {
            specialty:
              ProfessionalSpecialty.PEDICURIA,
          },
        );

      expect(result).toEqual({
        message:
          'Profesional actualizado exitosamente',
      });

      expect(
        professionalsRepositoryMock.update,
      ).toHaveBeenCalledWith(
        professionalId,
        {
          specialty:
            ProfessionalSpecialty.PEDICURIA,
        },
      );
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.updateProfessional(
          professionalId,
          {
            specialty:
              ProfessionalSpecialty.PEDICURIA,
          },
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        professionalsRepositoryMock.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteProfessional', () => {
    it('should deactivate the professional', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      professionalsRepositoryMock.update.mockResolvedValue({
        affected: 1,
      });

      const result =
        await repository.softDeleteProfessional(
          professionalId,
        );

      expect(result).toEqual({
        message:
          'Profesional eliminado correctamente',
      });

      expect(
        professionalsRepositoryMock.update,
      ).toHaveBeenCalledWith(
        professionalId,
        {
          isActive: false,
        },
      );
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.softDeleteProfessional(
          professionalId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateProfessional', () => {
    it('should activate an inactive professional', async () => {
      const professional = createProfessional({
        isActive: false,
      });

      professionalsRepositoryMock.findOne.mockResolvedValue(
        professional,
      );

      professionalsRepositoryMock.update.mockResolvedValue({
        affected: 1,
      });

      const result =
        await repository.activateProfessional(
          professionalId,
        );

      expect(result).toEqual({
        message:
          'Profesional activado correctamente',
      });

      expect(
        professionalsRepositoryMock.update,
      ).toHaveBeenCalledWith(
        professionalId,
        {
          isActive: true,
        },
      );
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.activateProfessional(
          professionalId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when the professional is already active', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional({
          isActive: true,
        }),
      );

      await expect(
        repository.activateProfessional(
          professionalId,
        ),
      ).rejects.toThrow(ConflictException);

      expect(
        professionalsRepositoryMock.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('associateService', () => {
    it('should associate an active service with an active professional', async () => {
      const professional = createProfessional();
      const service = createService();
      const professionalService =
        createProfessionalService();

      professionalsRepositoryMock.findOne.mockResolvedValue(
        professional,
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        service,
      );

      professionalServicesRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      professionalServicesRepositoryMock.create.mockReturnValue(
        professionalService,
      );

      professionalServicesRepositoryMock.save.mockResolvedValue(
        professionalService,
      );

      const result =
        await repository.associateService(
          professionalId,
          serviceId,
        );

      expect(result).toBe(professionalService);

      expect(
        professionalServicesRepositoryMock.create,
      ).toHaveBeenCalledWith({
        professionalId,
        serviceId,
        professional,
        service,
      });

      expect(
        professionalServicesRepositoryMock.save,
      ).toHaveBeenCalledWith(
        professionalService,
      );
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.associateService(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when the professional is inactive', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional({
          isActive: false,
        }),
      );

      await expect(
        repository.associateService(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(ConflictException);

      expect(
        servicesRepositoryMock.findOne,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the service does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.associateService(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when the service is inactive', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        createService({
          isActive: false,
        }),
      );

      await expect(
        repository.associateService(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(ConflictException);

      expect(
        professionalServicesRepositoryMock.findOne,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the service is already associated', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        createService(),
      );

      professionalServicesRepositoryMock.findOne.mockResolvedValue(
        createProfessionalService(),
      );

      await expect(
        repository.associateService(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(ConflictException);

      expect(
        professionalServicesRepositoryMock.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getServicesByProfessional', () => {
    it('should return services associated with the professional', async () => {
      const professionalService =
        createProfessionalService();

      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      professionalServicesRepositoryMock.find.mockResolvedValue(
        [professionalService],
      );

      const result =
        await repository.getServicesByProfessional(
          professionalId,
        );

      expect(result).toEqual([
        professionalService,
      ]);

      expect(
        professionalServicesRepositoryMock.find,
      ).toHaveBeenCalledWith({
        where: {
          professionalId,
        },
        relations: {
          service: true,
        },
      });
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.getServicesByProfessional(
          professionalId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        professionalServicesRepositoryMock.find,
      ).not.toHaveBeenCalled();
    });
  });

  describe('removeServiceFromProfessional', () => {
    it('should remove the service association', async () => {
      const association =
        createProfessionalService();

      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        createService(),
      );

      professionalServicesRepositoryMock.findOne.mockResolvedValue(
        association,
      );

      professionalServicesRepositoryMock.remove.mockResolvedValue(
        association,
      );

      const result =
        await repository.removeServiceFromProfessional(
          professionalId,
          serviceId,
        );

      expect(result).toEqual({
        message:
          'Servicio desvinculado del profesional exitosamente',
      });

      expect(
        professionalServicesRepositoryMock.remove,
      ).toHaveBeenCalledWith(association);
    });

    it('should throw when the professional does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.removeServiceFromProfessional(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        servicesRepositoryMock.findOne,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the service does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.removeServiceFromProfessional(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        professionalServicesRepositoryMock.findOne,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the association does not exist', async () => {
      professionalsRepositoryMock.findOne.mockResolvedValue(
        createProfessional(),
      );

      servicesRepositoryMock.findOne.mockResolvedValue(
        createService(),
      );

      professionalServicesRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.removeServiceFromProfessional(
          professionalId,
          serviceId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        professionalServicesRepositoryMock.remove,
      ).not.toHaveBeenCalled();
    });
  });
});
