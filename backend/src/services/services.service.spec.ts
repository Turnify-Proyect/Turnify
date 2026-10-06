import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ServicesService } from './services.service';
import { ServicesRepository } from './services.repository';
import { CloudinaryService } from '../config/cloudinary.service';
import { CategoriesRepository } from '../categories/categories.repository';

describe('ServicesService', () => {
  let service: ServicesService;

  let servicesRepository: {
    getAll: jest.Mock;
    getAllActive: jest.Mock;
    getById: jest.Mock;
    getByName: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
    reactivate: jest.Mock;
    getProfessionalsByService: jest.Mock;
    updateServiceImage: jest.Mock;
  };

  let cloudinaryService: {
    uploadImage: jest.Mock;
    uploadUrl: jest.Mock;
  };

  let categoriesRepository: {
    getCategoryById: jest.Mock;
  };

  beforeEach(async () => {
    servicesRepository = {
      getAll: jest.fn(),
      getAllActive: jest.fn(),
      getById: jest.fn(),
      getByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      reactivate: jest.fn(),
      getProfessionalsByService: jest.fn(),
      updateServiceImage: jest.fn(),
    };

    cloudinaryService = {
      uploadImage: jest.fn(),
      uploadUrl: jest.fn(),
    };

    categoriesRepository = {
      getCategoryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: ServicesRepository,
          useValue: servicesRepository,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryService,
        },
        {
          provide: CategoriesRepository,
          useValue: categoriesRepository,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all services', async () => {
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
      ];

      servicesRepository.getAll.mockResolvedValue(services);

      const result = await service.getAll();

      expect(result).toEqual(services);
      expect(servicesRepository.getAll).toHaveBeenCalledTimes(1);
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
      ];

      servicesRepository.getAllActive.mockResolvedValue(services);

      const result = await service.getAllActive();

      expect(result).toEqual(services);
      expect(servicesRepository.getAllActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('should return the service when it exists', async () => {
      const serviceData = {
        id: 'service-1',
        name: 'Corte',
      };

      servicesRepository.getById.mockResolvedValue(serviceData);

      const result = await service.getById('service-1');

      expect(result).toEqual(serviceData);
      expect(servicesRepository.getById).toHaveBeenCalledWith('service-1');
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      servicesRepository.getById.mockResolvedValue(null);

      await expect(service.getById('service-1')).rejects.toThrow(
        new NotFoundException('Service with id service-1 not found'),
      );
    });
  });

  describe('create', () => {
    const category = {
      id: 'category-1',
      name: 'Cabello',
      isActive: true,
    };

    const createData = {
      name: 'Corte',
      description: 'Corte de cabello',
      price: 5000,
      durationMinutes: 60,
      categoryId: 'category-1',
    };

    it('should create a service successfully', async () => {
      const createdService = {
        id: 'service-1',
        ...createData,
        category,
      };

      servicesRepository.getByName.mockResolvedValue(null);
      categoriesRepository.getCategoryById.mockResolvedValue(category);
      servicesRepository.create.mockResolvedValue(createdService);

      const result = await service.create({ ...createData });

      expect(result).toEqual(createdService);

      expect(servicesRepository.getByName).toHaveBeenCalledWith('Corte');

      expect(categoriesRepository.getCategoryById).toHaveBeenCalledWith(
        'category-1',
      );

      expect(servicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(createData),
        category,
      );
    });

    it('should throw ConflictException when the service name already exists', async () => {
      servicesRepository.getByName.mockResolvedValue({
        id: 'existing-service',
        name: 'Corte',
      });

      await expect(service.create({ ...createData })).rejects.toThrow(
        new ConflictException('Service with name Corte already exists'),
      );

      expect(categoriesRepository.getCategoryById).not.toHaveBeenCalled();
      expect(servicesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the category does not exist', async () => {
      servicesRepository.getByName.mockResolvedValue(null);
      categoriesRepository.getCategoryById.mockResolvedValue(null);

      await expect(service.create({ ...createData })).rejects.toThrow(
        new NotFoundException('No existe la categoría seleccionada'),
      );

      expect(servicesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the category is inactive', async () => {
      servicesRepository.getByName.mockResolvedValue(null);

      categoriesRepository.getCategoryById.mockResolvedValue({
        ...category,
        isActive: false,
      });

      await expect(service.create({ ...createData })).rejects.toThrow(
        new ConflictException(
          'La categoría seleccionada se encuentra inactiva',
        ),
      );

      expect(servicesRepository.create).not.toHaveBeenCalled();
    });

    it('should process a remote image URL before creating the service', async () => {
      const data = {
        ...createData,
        imageUrl: 'https://example.com/image.jpg',
      };

      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      servicesRepository.getByName.mockResolvedValue(null);
      categoriesRepository.getCategoryById.mockResolvedValue(category);

      cloudinaryService.uploadUrl.mockResolvedValue({
        secure_url: cloudinaryUrl,
      });

      servicesRepository.create.mockResolvedValue({
        id: 'service-1',
        ...data,
        imageUrl: cloudinaryUrl,
      });

      await service.create(data);

      expect(cloudinaryService.uploadUrl).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'turnify/services',
      );

      expect(servicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: cloudinaryUrl,
        }),
        category,
      );
    });

    it('should keep a Cloudinary URL without uploading it again', async () => {
      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      const data = {
        ...createData,
        imageUrl: cloudinaryUrl,
      };

      servicesRepository.getByName.mockResolvedValue(null);
      categoriesRepository.getCategoryById.mockResolvedValue(category);
      servicesRepository.create.mockResolvedValue({
        id: 'service-1',
        ...data,
      });

      await service.create(data);

      expect(cloudinaryService.uploadUrl).not.toHaveBeenCalled();

      expect(servicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: cloudinaryUrl,
        }),
        category,
      );
    });

    it('should keep a non-http image URL unchanged', async () => {
      const data = {
        ...createData,
        imageUrl: 'local-image.jpg',
      };

      servicesRepository.getByName.mockResolvedValue(null);
      categoriesRepository.getCategoryById.mockResolvedValue(category);
      servicesRepository.create.mockResolvedValue({
        id: 'service-1',
        ...data,
      });

      await service.create(data);

      expect(cloudinaryService.uploadUrl).not.toHaveBeenCalled();

      expect(servicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'local-image.jpg',
        }),
        category,
      );
    });

    it('should keep the original remote URL when Cloudinary upload fails', async () => {
      const remoteUrl = 'https://example.com/image.jpg';

      const data = {
        ...createData,
        imageUrl: remoteUrl,
      };

      servicesRepository.getByName.mockResolvedValue(null);
      categoriesRepository.getCategoryById.mockResolvedValue(category);

      cloudinaryService.uploadUrl.mockRejectedValue(
        new Error('Cloudinary unavailable'),
      );

      servicesRepository.create.mockResolvedValue({
        id: 'service-1',
        ...data,
      });

      const result = await service.create(data);

      expect(result).toBeDefined();

      expect(servicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: remoteUrl,
        }),
        category,
      );
    });
  });

  describe('update', () => {
    const existingService = {
      id: 'service-1',
      name: 'Corte',
      price: 5000,
      category: {
        id: 'category-1',
        name: 'Cabello',
        isActive: true,
      },
    };

    it('should update a service successfully', async () => {
      const data = {
        name: 'Corte premium',
        price: 7000,
      };

      const updatedService = {
        ...existingService,
        ...data,
      };

      servicesRepository.getById
        .mockResolvedValueOnce(existingService)
        .mockResolvedValueOnce(updatedService);

      servicesRepository.getByName.mockResolvedValue(null);
      servicesRepository.update.mockResolvedValue(undefined);

      const result = await service.update('service-1', data as any);

      expect(result).toEqual(updatedService);

      expect(servicesRepository.getById).toHaveBeenCalledTimes(2);
      expect(servicesRepository.getByName).toHaveBeenCalledWith(
        'Corte premium',
      );

      expect(servicesRepository.update).toHaveBeenCalledWith(
        'service-1',
        data,
        undefined,
      );
    });

    it('should throw when the service does not exist', async () => {
      servicesRepository.getById.mockResolvedValue(null);

      await expect(
        service.update('service-1', {
          name: 'Nuevo nombre',
        } as any),
      ).rejects.toThrow(
        new NotFoundException('Service with id service-1 not found'),
      );

      expect(servicesRepository.update).not.toHaveBeenCalled();
    });

    it('should allow keeping the same service name', async () => {
      servicesRepository.getById
        .mockResolvedValueOnce(existingService)
        .mockResolvedValueOnce(existingService);

      servicesRepository.getByName.mockResolvedValue(existingService);
      servicesRepository.update.mockResolvedValue(undefined);

      const data = {
        name: 'Corte',
      };

      await service.update('service-1', data as any);

      expect(servicesRepository.getByName).toHaveBeenCalledWith('Corte');

      expect(servicesRepository.update).toHaveBeenCalledWith(
        'service-1',
        data,
        undefined,
      );
    });

    it('should throw when the new name belongs to another service', async () => {
      servicesRepository.getById.mockResolvedValue(existingService);

      servicesRepository.getByName.mockResolvedValue({
        id: 'service-2',
        name: 'Corte premium',
      });

      await expect(
        service.update('service-1', {
          name: 'Corte premium',
        } as any),
      ).rejects.toThrow(
        new ConflictException('Service with name Corte premium already exists'),
      );

      expect(servicesRepository.update).not.toHaveBeenCalled();
    });

    it('should update the category when categoryId is provided', async () => {
      const category = {
        id: 'category-2',
        name: 'Barbería',
        isActive: true,
      };

      const data = {
        name: 'Corte',
        categoryId: 'category-2',
      };

      servicesRepository.getById
        .mockResolvedValueOnce(existingService)
        .mockResolvedValueOnce({
          ...existingService,
          category,
        });

      servicesRepository.getByName.mockResolvedValue(existingService);

      categoriesRepository.getCategoryById.mockResolvedValue(category);

      servicesRepository.update.mockResolvedValue(undefined);

      await service.update('service-1', data as any);

      expect(categoriesRepository.getCategoryById).toHaveBeenCalledWith(
        'category-2',
      );

      expect(servicesRepository.update).toHaveBeenCalledWith(
        'service-1',
        data,
        category,
      );
    });

    it('should reject an inactive category during update', async () => {
      servicesRepository.getById.mockResolvedValue(existingService);
      servicesRepository.getByName.mockResolvedValue(existingService);

      categoriesRepository.getCategoryById.mockResolvedValue({
        id: 'category-2',
        name: 'Barbería',
        isActive: false,
      });

      await expect(
        service.update('service-1', {
          categoryId: 'category-2',
        } as any),
      ).rejects.toThrow(
        new ConflictException(
          'La categoría seleccionada se encuentra inactiva',
        ),
      );

      expect(servicesRepository.update).not.toHaveBeenCalled();
    });

    it('should process a remote image during update', async () => {
      const remoteUrl = 'https://example.com/image.jpg';
      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      servicesRepository.getById
        .mockResolvedValueOnce(existingService)
        .mockResolvedValueOnce({
          ...existingService,
          imageUrl: cloudinaryUrl,
        });

      cloudinaryService.uploadUrl.mockResolvedValue({
        secure_url: cloudinaryUrl,
      });

      servicesRepository.update.mockResolvedValue(undefined);

      const data = {
        imageUrl: remoteUrl,
      };

      await service.update('service-1', data as any);

      expect(cloudinaryService.uploadUrl).toHaveBeenCalledWith(
        remoteUrl,
        'turnify/services',
      );

      expect(servicesRepository.update).toHaveBeenCalledWith(
        'service-1',
        expect.objectContaining({
          imageUrl: cloudinaryUrl,
        }),
        undefined,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate an existing service', async () => {
      const activeService = {
        id: 'service-1',
        isActive: true,
      };

      const inactiveService = {
        id: 'service-1',
        isActive: false,
      };

      servicesRepository.getById
        .mockResolvedValueOnce(activeService)
        .mockResolvedValueOnce(inactiveService);

      servicesRepository.deactivate.mockResolvedValue(undefined);

      const result = await service.deactivate('service-1');

      expect(result).toEqual(inactiveService);

      expect(servicesRepository.deactivate).toHaveBeenCalledWith('service-1');

      expect(servicesRepository.getById).toHaveBeenCalledTimes(2);
    });

    it('should not deactivate a service that does not exist', async () => {
      servicesRepository.getById.mockResolvedValue(null);

      await expect(service.deactivate('service-1')).rejects.toThrow(
        new NotFoundException('Service with id service-1 not found'),
      );

      expect(servicesRepository.deactivate).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should reactivate an existing service', async () => {
      const inactiveService = {
        id: 'service-1',
        isActive: false,
      };

      const activeService = {
        id: 'service-1',
        isActive: true,
      };

      servicesRepository.getById
        .mockResolvedValueOnce(inactiveService)
        .mockResolvedValueOnce(activeService);

      servicesRepository.reactivate.mockResolvedValue(undefined);

      const result = await service.reactivate('service-1');

      expect(result).toEqual(activeService);

      expect(servicesRepository.reactivate).toHaveBeenCalledWith('service-1');

      expect(servicesRepository.getById).toHaveBeenCalledTimes(2);
    });

    it('should not reactivate a service that does not exist', async () => {
      servicesRepository.getById.mockResolvedValue(null);

      await expect(service.reactivate('service-1')).rejects.toThrow(
        new NotFoundException('Service with id service-1 not found'),
      );

      expect(servicesRepository.reactivate).not.toHaveBeenCalled();
    });
  });

  describe('getProfessionalsByService', () => {
    it('should return professionals associated with the service', async () => {
      const professionals = [
        {
          professionalId: 'professional-1',
          serviceId: 'service-1',
        },
      ];

      servicesRepository.getProfessionalsByService.mockResolvedValue(
        professionals,
      );

      const result = await service.getProfessionalsByService('service-1');

      expect(result).toEqual(professionals);

      expect(servicesRepository.getProfessionalsByService).toHaveBeenCalledWith(
        'service-1',
      );
    });
  });

  describe('updateServiceImage', () => {
    it('should upload the image and update the service URL', async () => {
      const file = {
        originalname: 'service.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      const updatedService = {
        id: 'service-1',
        imageUrl: cloudinaryUrl,
      };

      cloudinaryService.uploadImage.mockResolvedValue({
        secure_url: cloudinaryUrl,
      });

      servicesRepository.updateServiceImage.mockResolvedValue(updatedService);

      const result = await service.updateServiceImage('service-1', file);

      expect(result).toEqual(updatedService);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(1);
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        file,
        'turnify/services',
      );

      expect(servicesRepository.updateServiceImage).toHaveBeenCalledWith(
        'service-1',
        cloudinaryUrl,
      );
    });

    it('should propagate Cloudinary upload errors', async () => {
      const file = {
        originalname: 'service.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const error = new Error('Cloudinary error');

      cloudinaryService.uploadImage.mockRejectedValue(error);

      await expect(
        service.updateServiceImage('service-1', file),
      ).rejects.toThrow(error);

      expect(servicesRepository.updateServiceImage).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const file = {
        originalname: 'service.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      const error = new NotFoundException(
        'No existe un servicio con el ID proporcionado',
      );

      cloudinaryService.uploadImage.mockResolvedValue({
        secure_url: cloudinaryUrl,
      });

      servicesRepository.updateServiceImage.mockRejectedValue(error);

      await expect(
        service.updateServiceImage('service-1', file),
      ).rejects.toThrow(error);
    });
  });
});
