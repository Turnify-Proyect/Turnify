import { NotFoundException } from '@nestjs/common';
import { ServicesRepository } from './services.repository';
import { Service } from './entities/service.entity';
import { ProfessionalService } from '../professionals/entities/professional-service.entity';
import { Category } from '../categories/category.entity';

describe('ServicesRepository', () => {
  let repository: ServicesRepository;

  let ormServiceRepositoryMock: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  let professionalServicesRepositoryMock: {
    find: jest.Mock;
  };

  const serviceId = 'service-123';
  const categoryId = 'category-123';
  const professionalId = 'professional-123';

  const category = {
    id: categoryId,
    name: 'Categoría',
    isActive: true,
  } as unknown as Category;

  const service = {
    id: serviceId,
    name: 'Masaje relajante',
    description: 'Masaje de relajación',
    price: '10000.00',
    durationMinutes: 60,
    imageUrl: null,
    isActive: true,
    category,
  } as unknown as Service;

  beforeEach(() => {
    jest.clearAllMocks();

    ormServiceRepositoryMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    professionalServicesRepositoryMock = {
      find: jest.fn(),
    };

    repository = new ServicesRepository(
      ormServiceRepositoryMock as any,
      professionalServicesRepositoryMock as any,
    );
  });

  describe('getAll', () => {
    it('should return all services with their category', async () => {
      const response = [service];

      ormServiceRepositoryMock.find.mockResolvedValue(response);

      const result = await repository.getAll();

      expect(result).toBe(response);

      expect(ormServiceRepositoryMock.find).toHaveBeenCalledWith({
        relations: {
          category: true,
        },
      });
    });
  });

  describe('getAllActive', () => {
    it('should return only active services with their category', async () => {
      const response = [service];

      ormServiceRepositoryMock.find.mockResolvedValue(response);

      const result = await repository.getAllActive();

      expect(result).toBe(response);

      expect(ormServiceRepositoryMock.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
        relations: {
          category: true,
        },
      });
    });
  });

  describe('getByName', () => {
    it('should return the service with the given name', async () => {
      ormServiceRepositoryMock.findOneBy.mockResolvedValue(service);

      const result = await repository.getByName(
        'Masaje relajante',
      );

      expect(result).toBe(service);

      expect(
        ormServiceRepositoryMock.findOneBy,
      ).toHaveBeenCalledWith({
        name: 'Masaje relajante',
      });
    });

    it('should return null when the service does not exist', async () => {
      ormServiceRepositoryMock.findOneBy.mockResolvedValue(null);

      const result = await repository.getByName(
        'Servicio inexistente',
      );

      expect(result).toBeNull();

      expect(
        ormServiceRepositoryMock.findOneBy,
      ).toHaveBeenCalledWith({
        name: 'Servicio inexistente',
      });
    });
  });

  describe('getById', () => {
    it('should return the service with its category', async () => {
      ormServiceRepositoryMock.findOne.mockResolvedValue(service);

      const result = await repository.getById(serviceId);

      expect(result).toBe(service);

      expect(
        ormServiceRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: serviceId,
        },
        relations: {
          category: true,
        },
      });
    });

    it('should return null when the service does not exist', async () => {
      ormServiceRepositoryMock.findOne.mockResolvedValue(null);

      const result = await repository.getById(serviceId);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save the service with the category', async () => {
      const data = {
        name: 'Masaje relajante',
        description: 'Masaje de relajación',
        price: '10000.00',
        durationMinutes: 60,
        imageUrl: null,
        categoryId,
      } as any;

      const createdService = {
        ...service,
      };

      ormServiceRepositoryMock.create.mockReturnValue(
        createdService,
      );

      ormServiceRepositoryMock.save.mockResolvedValue(
        createdService,
      );

      ormServiceRepositoryMock.findOne.mockResolvedValue(
        createdService,
      );

      const result = await repository.create(
        data,
        category,
      );

      expect(
        ormServiceRepositoryMock.create,
      ).toHaveBeenCalledWith({
        name: data.name,
        description: data.description,
        price: data.price,
        durationMinutes: data.durationMinutes,
        imageUrl: data.imageUrl,
        category,
      });

      expect(
        ormServiceRepositoryMock.save,
      ).toHaveBeenCalledWith(createdService);

      expect(
        ormServiceRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: createdService.id,
        },
        relations: {
          category: true,
        },
      });

      expect(result).toBe(createdService);
    });
  });

  describe('update', () => {
    it('should update the service without changing the category', async () => {
      const data = {
        name: 'Nuevo nombre',
        price: '15000.00',
      } as any;

      const existingService = {
        ...service,
      };

      ormServiceRepositoryMock.findOneBy.mockResolvedValue(
        existingService,
      );

      ormServiceRepositoryMock.save.mockResolvedValue(
        existingService,
      );

      const result = await repository.update(
        serviceId,
        data,
      );

      expect(
        ormServiceRepositoryMock.findOneBy,
      ).toHaveBeenCalledWith({
        id: serviceId,
      });

      expect(existingService.name).toBe('Nuevo nombre');
      expect(existingService.price).toBe('15000.00');

      expect(
        ormServiceRepositoryMock.save,
      ).toHaveBeenCalledWith(existingService);

      expect(result).toBeUndefined();
    });

    it('should update the service and its category', async () => {
      const newCategory = {
        id: 'category-456',
        name: 'Nueva categoría',
        isActive: true,
      } as unknown as Category;

      const data = {
        name: 'Nuevo nombre',
        categoryId: newCategory.id,
      } as any;

      const existingService = {
        ...service,
      };

      ormServiceRepositoryMock.findOneBy.mockResolvedValue(
        existingService,
      );

      ormServiceRepositoryMock.save.mockResolvedValue(
        existingService,
      );

      await repository.update(
        serviceId,
        data,
        newCategory,
      );

      expect(existingService.name).toBe(
        'Nuevo nombre',
      );

      expect(existingService.category).toBe(
        newCategory,
      );

      expect(
        ormServiceRepositoryMock.save,
      ).toHaveBeenCalledWith(existingService);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      ormServiceRepositoryMock.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.update(serviceId, {
          name: 'Nuevo nombre',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(
        ormServiceRepositoryMock.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate the service', async () => {
      ormServiceRepositoryMock.update.mockResolvedValue({
        affected: 1,
      });

      const result = await repository.deactivate(
        serviceId,
      );

      expect(
        ormServiceRepositoryMock.update,
      ).toHaveBeenCalledWith(serviceId, {
        isActive: false,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('reactivate', () => {
    it('should reactivate the service', async () => {
      ormServiceRepositoryMock.update.mockResolvedValue({
        affected: 1,
      });

      const result = await repository.reactivate(
        serviceId,
      );

      expect(
        ormServiceRepositoryMock.update,
      ).toHaveBeenCalledWith(serviceId, {
        isActive: true,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getProfessionalsByService', () => {
    it('should return the professionals associated with the service', async () => {
      const professionalService = {
        professionalId,
        serviceId,
        professional: {
          id: professionalId,
          user: {
            id: 'user-123',
          },
        },
      } as unknown as ProfessionalService;

      ormServiceRepositoryMock.findOne.mockResolvedValue(
        service,
      );

      professionalServicesRepositoryMock.find.mockResolvedValue(
        [professionalService],
      );

      const result =
        await repository.getProfessionalsByService(
          serviceId,
        );

      expect(
        ormServiceRepositoryMock.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: serviceId,
        },
      });

      expect(
        professionalServicesRepositoryMock.find,
      ).toHaveBeenCalledWith({
        where: {
          serviceId,
        },
        relations: {
          professional: {
            user: true,
          },
        },
      });

      expect(result).toEqual([
        professionalService,
      ]);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      ormServiceRepositoryMock.findOne.mockResolvedValue(
        null,
      );

      await expect(
        repository.getProfessionalsByService(
          serviceId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        professionalServicesRepositoryMock.find,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateServiceImage', () => {
    it('should update the service image URL and save it', async () => {
      const existingService = {
        ...service,
        imageUrl: null,
      };

      ormServiceRepositoryMock.findOneBy.mockResolvedValue(
        existingService,
      );

      ormServiceRepositoryMock.save.mockResolvedValue(
        existingService,
      );

      const imageUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      const result =
        await repository.updateServiceImage(
          serviceId,
          imageUrl,
        );

      expect(
        ormServiceRepositoryMock.findOneBy,
      ).toHaveBeenCalledWith({
        id: serviceId,
      });

      expect(existingService.imageUrl).toBe(
        imageUrl,
      );

      expect(
        ormServiceRepositoryMock.save,
      ).toHaveBeenCalledWith(existingService);

      expect(result).toBe(existingService);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      ormServiceRepositoryMock.findOneBy.mockResolvedValue(
        null,
      );

      await expect(
        repository.updateServiceImage(
          serviceId,
          'https://example.com/image.jpg',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        ormServiceRepositoryMock.save,
      ).not.toHaveBeenCalled();
    });
  });
});
