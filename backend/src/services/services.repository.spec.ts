import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ServicesRepository } from './services.repository';
import { Service } from './entities/service.entity';
import { ProfessionalService } from '../professionals/entities/professional-service.entity';

describe('ServicesRepository', () => {
  let repository: ServicesRepository;

  let serviceRepository: jest.Mocked<Repository<Service>>;
  let professionalServicesRepository: jest.Mocked<
    Repository<ProfessionalService>
  >;

  beforeEach(async () => {
    const mockServiceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockProfessionalServicesRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesRepository,
        {
          provide: getRepositoryToken(Service),
          useValue: mockServiceRepository,
        },
        {
          provide: getRepositoryToken(ProfessionalService),
          useValue: mockProfessionalServicesRepository,
        },
      ],
    }).compile();

    repository = module.get<ServicesRepository>(ServicesRepository);

    serviceRepository = module.get(getRepositoryToken(Service));
    professionalServicesRepository = module.get(
      getRepositoryToken(ProfessionalService),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all services including inactive ones', async () => {
      const services = [
        {
          id: 'service-1',
          name: 'Corte',
          isActive: true,
        },
        {
          id: 'service-2',
          name: 'Color',
          isActive: false,
        },
      ] as Service[];

      serviceRepository.find.mockResolvedValue(services);

      const result = await repository.getAll();

      expect(result).toEqual(services);

      expect(serviceRepository.find).toHaveBeenCalledTimes(1);
      expect(serviceRepository.find).toHaveBeenCalledWith({
        relations: {
          category: true,
        },
      });
    });
  });

  describe('getAllActive', () => {
    it('should return only active services', async () => {
      const services = [
        {
          id: 'service-1',
          name: 'Corte',
          isActive: true,
        },
      ] as Service[];

      serviceRepository.find.mockResolvedValue(services);

      const result = await repository.getAllActive();

      expect(result).toEqual(services);

      expect(serviceRepository.find).toHaveBeenCalledTimes(1);
      expect(serviceRepository.find).toHaveBeenCalledWith({
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
    it('should return a service by name', async () => {
      const service = {
        id: 'service-1',
        name: 'Corte',
      } as Service;

      serviceRepository.findOneBy.mockResolvedValue(service);

      const result = await repository.getByName('Corte');

      expect(result).toEqual(service);

      expect(serviceRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(serviceRepository.findOneBy).toHaveBeenCalledWith({
        name: 'Corte',
      });
    });

    it('should return null when the service does not exist', async () => {
      serviceRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.getByName('Inexistente');

      expect(result).toBeNull();

      expect(serviceRepository.findOneBy).toHaveBeenCalledWith({
        name: 'Inexistente',
      });
    });
  });

  describe('getById', () => {
    it('should return a service by id with its category', async () => {
      const service = {
        id: 'service-1',
        name: 'Corte',
        category: {
          id: 'category-1',
          name: 'Cabello',
        },
      } as Service;

      serviceRepository.findOne.mockResolvedValue(service);

      const result = await repository.getById('service-1');

      expect(result).toEqual(service);

      expect(serviceRepository.findOne).toHaveBeenCalledTimes(1);
      expect(serviceRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'service-1',
        },
        relations: {
          category: true,
        },
      });
    });

    it('should return null when the service does not exist', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      const result = await repository.getById('service-1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return the saved service with its category', async () => {
      const data = {
        name: 'Corte',
        description: 'Corte de cabello',
        price: 5000,
        durationMinutes: 60,
        categoryId: 'category-1',
      } as any;

      const category = {
        id: 'category-1',
        name: 'Cabello',
      } as any;

      const createdService = {
        name: 'Corte',
        description: 'Corte de cabello',
        price: 5000,
        durationMinutes: 60,
        category,
      } as Service;

      const savedService = {
        id: 'service-1',
        ...createdService,
      } as Service;

      const serviceWithCategory = {
        id: 'service-1',
        ...createdService,
      } as Service;

      serviceRepository.create.mockReturnValue(createdService);
      serviceRepository.save.mockResolvedValue(savedService);
      serviceRepository.findOne.mockResolvedValue(serviceWithCategory);

      const result = await repository.create(data, category);

      expect(result).toEqual(serviceWithCategory);

      expect(serviceRepository.create).toHaveBeenCalledTimes(1);
      expect(serviceRepository.create).toHaveBeenCalledWith({
        name: 'Corte',
        description: 'Corte de cabello',
        price: 5000,
        durationMinutes: 60,
        category,
      });

      expect(serviceRepository.save).toHaveBeenCalledTimes(1);
      expect(serviceRepository.save).toHaveBeenCalledWith(createdService);

      expect(serviceRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'service-1',
        },
        relations: {
          category: true,
        },
      });
    });
  });

  describe('update', () => {
    it('should update a service without changing its category', async () => {
      const service = {
        id: 'service-1',
        name: 'Corte',
        description: 'Descripción anterior',
        price: 5000,
        durationMinutes: 60,
      } as Service;

      const data = {
        name: 'Corte premium',
        price: 7000,
      } as any;

      serviceRepository.findOneBy.mockResolvedValue(service);
      serviceRepository.save.mockResolvedValue(service);

      await repository.update('service-1', data);

      expect(serviceRepository.findOneBy).toHaveBeenCalledWith({
        id: 'service-1',
      });

      expect(service.name).toBe('Corte premium');
      expect(service.price).toBe(7000);

      expect(serviceRepository.save).toHaveBeenCalledWith(service);
    });

    it('should update the category when a category is provided', async () => {
      const service = {
        id: 'service-1',
        name: 'Corte',
      } as Service;

      const category = {
        id: 'category-2',
        name: 'Barbería',
      } as any;

      const data = {
        name: 'Corte barbería',
        categoryId: 'category-2',
      } as any;

      serviceRepository.findOneBy.mockResolvedValue(service);
      serviceRepository.save.mockResolvedValue(service);

      await repository.update('service-1', data, category);

      expect(service.name).toBe('Corte barbería');
      expect(service.category).toBe(category);

      expect(serviceRepository.save).toHaveBeenCalledWith(service);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      serviceRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.update('service-1', {
          name: 'Corte',
        } as any),
      ).rejects.toThrow(
        new NotFoundException('No existe un servicio con el ID proporcionado'),
      );

      expect(serviceRepository.save).not.toHaveBeenCalled();
    });

    it('should not overwrite the category when no category is provided', async () => {
      const oldCategory = {
        id: 'category-1',
        name: 'Cabello',
      };

      const service = {
        id: 'service-1',
        name: 'Corte',
        category: oldCategory,
      } as Service;

      const data = {
        description: 'Nueva descripción',
      } as any;

      serviceRepository.findOneBy.mockResolvedValue(service);
      serviceRepository.save.mockResolvedValue(service);

      await repository.update('service-1', data);

      expect(service.category).toBe(oldCategory);
      expect(service.description).toBe('Nueva descripción');
    });
  });

  describe('deactivate', () => {
    it('should deactivate a service', async () => {
      serviceRepository.update.mockResolvedValue({
        affected: 1,
      } as any);

      await repository.deactivate('service-1');

      expect(serviceRepository.update).toHaveBeenCalledTimes(1);
      expect(serviceRepository.update).toHaveBeenCalledWith('service-1', {
        isActive: false,
      });
    });
  });

  describe('reactivate', () => {
    it('should reactivate a service', async () => {
      serviceRepository.update.mockResolvedValue({
        affected: 1,
      } as any);

      await repository.reactivate('service-1');

      expect(serviceRepository.update).toHaveBeenCalledTimes(1);
      expect(serviceRepository.update).toHaveBeenCalledWith('service-1', {
        isActive: true,
      });
    });
  });

  describe('getProfessionalsByService', () => {
    it('should return professionals associated with the service', async () => {
      const service = {
        id: 'service-1',
        name: 'Corte',
      } as Service;

      const professionalServices = [
        {
          professionalId: 'professional-1',
          serviceId: 'service-1',
          professional: {
            id: 'professional-1',
            user: {
              id: 'user-1',
              name: 'Juan',
            },
          },
        },
      ] as ProfessionalService[];

      serviceRepository.findOne.mockResolvedValue(service);
      professionalServicesRepository.find.mockResolvedValue(
        professionalServices,
      );

      const result = await repository.getProfessionalsByService('service-1');

      expect(result).toEqual(professionalServices);

      expect(serviceRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'service-1',
        },
      });

      expect(professionalServicesRepository.find).toHaveBeenCalledWith({
        where: {
          serviceId: 'service-1',
        },
        relations: {
          professional: {
            user: true,
          },
        },
      });
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getProfessionalsByService('service-1'),
      ).rejects.toThrow(
        new NotFoundException('No existe un servicio con el ID proporcionado'),
      );

      expect(professionalServicesRepository.find).not.toHaveBeenCalled();
    });

    it('should return an empty array when the service has no professionals', async () => {
      const service = {
        id: 'service-1',
      } as Service;

      serviceRepository.findOne.mockResolvedValue(service);
      professionalServicesRepository.find.mockResolvedValue([]);

      const result = await repository.getProfessionalsByService('service-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateServiceImage', () => {
    it('should update the service image URL', async () => {
      const service = {
        id: 'service-1',
        name: 'Corte',
        imageUrl: null,
      } as Service;

      const updatedService = {
        ...service,
        imageUrl: 'https://cloudinary.com/service-image.jpg',
      } as Service;

      serviceRepository.findOneBy.mockResolvedValue(service);
      serviceRepository.save.mockResolvedValue(updatedService);

      const result = await repository.updateServiceImage(
        'service-1',
        'https://cloudinary.com/service-image.jpg',
      );

      expect(result).toEqual(updatedService);

      expect(service.imageUrl).toBe('https://cloudinary.com/service-image.jpg');

      expect(serviceRepository.save).toHaveBeenCalledWith(service);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      serviceRepository.findOneBy.mockResolvedValue(null);

      await expect(
        repository.updateServiceImage(
          'service-1',
          'https://cloudinary.com/image.jpg',
        ),
      ).rejects.toThrow(
        new NotFoundException('No existe un servicio con el ID proporcionado'),
      );

      expect(serviceRepository.save).not.toHaveBeenCalled();
    });
  });
});
