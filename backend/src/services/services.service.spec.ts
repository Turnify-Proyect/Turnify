import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesRepository } from './services.repository';
import { CloudinaryService } from '../config/cloudinary.service';
import { CategoriesRepository } from '../categories/categories.repository';
import { Service } from './entities/service.entity';

describe('ServicesService', () => {
  let service: ServicesService;

  let servicesRepositoryMock: {
    getAll: jest.Mock;
    getAllActive: jest.Mock;
    getByName: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
    reactivate: jest.Mock;
    getProfessionalsByService: jest.Mock;
    updateServiceImage: jest.Mock;
  };

  let cloudinaryServiceMock: {
    uploadImage: jest.Mock;
    uploadUrl: jest.Mock;
  };

  let categoriesRepositoryMock: {
    getCategoryById: jest.Mock;
  };

  const serviceId = 'service-123';
  const categoryId = 'category-123';

  const category = {
    id: categoryId,
    name: 'Masajes',
    isActive: true,
  };

  const serviceEntity = {
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

    servicesRepositoryMock = {
      getAll: jest.fn(),
      getAllActive: jest.fn(),
      getByName: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      reactivate: jest.fn(),
      getProfessionalsByService: jest.fn(),
      updateServiceImage: jest.fn(),
    };

    cloudinaryServiceMock = {
      uploadImage: jest.fn(),
      uploadUrl: jest.fn(),
    };

    categoriesRepositoryMock = {
      getCategoryById: jest.fn(),
    };

    service = new ServicesService(
      servicesRepositoryMock as unknown as ServicesRepository,
      cloudinaryServiceMock as unknown as CloudinaryService,
      categoriesRepositoryMock as unknown as CategoriesRepository,
    );
  });

  describe('getAll', () => {
    it('should return all services', async () => {
      const response = [serviceEntity];

      servicesRepositoryMock.getAll.mockResolvedValue(response);

      const result = await service.getAll();

      expect(result).toBe(response);

      expect(servicesRepositoryMock.getAll).toHaveBeenCalled();
    });
  });

  describe('getAllActive', () => {
    it('should return active services', async () => {
      const response = [serviceEntity];

      servicesRepositoryMock.getAllActive.mockResolvedValue(response);

      const result = await service.getAllActive();

      expect(result).toBe(response);

      expect(servicesRepositoryMock.getAllActive).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return the service when it exists', async () => {
      servicesRepositoryMock.getById.mockResolvedValue(serviceEntity);

      const result = await service.getById(serviceId);

      expect(result).toBe(serviceEntity);

      expect(servicesRepositoryMock.getById).toHaveBeenCalledWith(serviceId);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      servicesRepositoryMock.getById.mockResolvedValue(null);

      await expect(service.getById(serviceId)).rejects.toThrow(
        NotFoundException,
      );

      expect(servicesRepositoryMock.getById).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('create', () => {
    it('should create a service successfully', async () => {
      const data = {
        name: 'Masaje relajante',
        description: 'Masaje de relajación',
        price: '10000.00',
        durationMinutes: 60,
        categoryId,
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(category);

      servicesRepositoryMock.create.mockResolvedValue(serviceEntity);

      const result = await service.create(data);

      expect(servicesRepositoryMock.getByName).toHaveBeenCalledWith(data.name);

      expect(categoriesRepositoryMock.getCategoryById).toHaveBeenCalledWith(
        categoryId,
      );

      expect(servicesRepositoryMock.create).toHaveBeenCalledWith(
        data,
        category,
      );

      expect(result).toBe(serviceEntity);
    });

    it('should throw ConflictException when the name already exists', async () => {
      const data = {
        name: 'Masaje relajante',
        categoryId,
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(serviceEntity);

      await expect(service.create(data)).rejects.toThrow(ConflictException);

      expect(categoriesRepositoryMock.getCategoryById).not.toHaveBeenCalled();

      expect(servicesRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the category does not exist', async () => {
      const data = {
        name: 'Masaje relajante',
        categoryId,
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(null);

      await expect(service.create(data)).rejects.toThrow(NotFoundException);

      expect(servicesRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the category is inactive', async () => {
      const data = {
        name: 'Masaje relajante',
        categoryId,
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue({
        ...category,
        isActive: false,
      });

      await expect(service.create(data)).rejects.toThrow(ConflictException);

      expect(servicesRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('should process a remote image URL through Cloudinary', async () => {
      const data = {
        name: 'Masaje relajante',
        categoryId,
        imageUrl: 'https://example.com/image.jpg',
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(category);

      cloudinaryServiceMock.uploadUrl.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/service.jpg',
      });

      servicesRepositoryMock.create.mockResolvedValue(serviceEntity);

      await service.create(data);

      expect(cloudinaryServiceMock.uploadUrl).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'turnify/services',
      );

      expect(data.imageUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/service.jpg',
      );

      expect(servicesRepositoryMock.create).toHaveBeenCalledWith(
        data,
        category,
      );
    });

    it('should not upload an existing Cloudinary URL', async () => {
      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      const data = {
        name: 'Masaje relajante',
        categoryId,
        imageUrl: cloudinaryUrl,
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(category);

      servicesRepositoryMock.create.mockResolvedValue(serviceEntity);

      await service.create(data);

      expect(cloudinaryServiceMock.uploadUrl).not.toHaveBeenCalled();

      expect(data.imageUrl).toBe(cloudinaryUrl);

      expect(servicesRepositoryMock.create).toHaveBeenCalledWith(
        data,
        category,
      );
    });

    it('should keep the original URL when Cloudinary upload fails', async () => {
      const imageUrl = 'https://example.com/image.jpg';

      const data = {
        name: 'Masaje relajante',
        categoryId,
        imageUrl,
      } as any;

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(category);

      cloudinaryServiceMock.uploadUrl.mockRejectedValue(
        new Error('Cloudinary error'),
      );

      servicesRepositoryMock.create.mockResolvedValue(serviceEntity);

      const result = await service.create(data);

      expect(data.imageUrl).toBe(imageUrl);

      expect(servicesRepositoryMock.create).toHaveBeenCalledWith(
        data,
        category,
      );

      expect(result).toBe(serviceEntity);
    });
  });

  describe('update', () => {
    it('should update the service successfully', async () => {
      const data = {
        name: 'Nuevo nombre',
        price: '15000.00',
      } as any;

      servicesRepositoryMock.getById
        .mockResolvedValueOnce(serviceEntity)
        .mockResolvedValueOnce({
          ...serviceEntity,
          ...data,
        });

      servicesRepositoryMock.getByName.mockResolvedValue(null);

      servicesRepositoryMock.update.mockResolvedValue(undefined);

      const result = await service.update(serviceId, data);

      expect(servicesRepositoryMock.getById).toHaveBeenCalledWith(serviceId);

      expect(servicesRepositoryMock.getByName).toHaveBeenCalledWith(data.name);

      expect(servicesRepositoryMock.update).toHaveBeenCalledWith(
        serviceId,
        data,
        undefined,
      );

      expect(result).toEqual({
        ...serviceEntity,
        ...data,
      });
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      const data = {
        name: 'Nuevo nombre',
      } as any;

      servicesRepositoryMock.getById.mockResolvedValue(null);

      await expect(service.update(serviceId, data)).rejects.toThrow(
        NotFoundException,
      );

      expect(servicesRepositoryMock.getByName).not.toHaveBeenCalled();

      expect(servicesRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new name is already used', async () => {
      const data = {
        name: 'Nombre existente',
      } as any;

      servicesRepositoryMock.getById.mockResolvedValue(serviceEntity);

      servicesRepositoryMock.getByName.mockResolvedValue({
        id: 'another-service-id',
        name: data.name,
      });

      await expect(service.update(serviceId, data)).rejects.toThrow(
        ConflictException,
      );

      expect(servicesRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should allow the service to keep its current name', async () => {
      const data = {
        name: serviceEntity.name,
      } as any;

      servicesRepositoryMock.getById
        .mockResolvedValueOnce(serviceEntity)
        .mockResolvedValueOnce(serviceEntity);

      servicesRepositoryMock.getByName.mockResolvedValue(serviceEntity);

      servicesRepositoryMock.update.mockResolvedValue(undefined);

      await service.update(serviceId, data);

      expect(servicesRepositoryMock.getByName).toHaveBeenCalledWith(
        serviceEntity.name,
      );

      expect(servicesRepositoryMock.update).toHaveBeenCalled();
    });

    it('should process a remote image URL during update', async () => {
      const data = {
        imageUrl: 'https://example.com/image.jpg',
      } as any;

      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      servicesRepositoryMock.getById
        .mockResolvedValueOnce(serviceEntity)
        .mockResolvedValueOnce({
          ...serviceEntity,
          imageUrl: cloudinaryUrl,
        });

      cloudinaryServiceMock.uploadUrl.mockResolvedValue({
        secure_url: cloudinaryUrl,
      });

      servicesRepositoryMock.update.mockResolvedValue(undefined);

      await service.update(serviceId, data);

      expect(cloudinaryServiceMock.uploadUrl).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'turnify/services',
      );

      expect(data.imageUrl).toBe(cloudinaryUrl);

      expect(servicesRepositoryMock.update).toHaveBeenCalledWith(
        serviceId,
        data,
        undefined,
      );
    });

    it('should validate the new category when categoryId is provided', async () => {
      const newCategory = {
        id: 'category-456',
        name: 'Nueva categoría',
        isActive: true,
      };

      const data = {
        categoryId: newCategory.id,
      } as any;

      servicesRepositoryMock.getById
        .mockResolvedValueOnce(serviceEntity)
        .mockResolvedValueOnce(serviceEntity);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(newCategory);

      servicesRepositoryMock.update.mockResolvedValue(undefined);

      await service.update(serviceId, data);

      expect(categoriesRepositoryMock.getCategoryById).toHaveBeenCalledWith(
        newCategory.id,
      );

      expect(servicesRepositoryMock.update).toHaveBeenCalledWith(
        serviceId,
        data,
        newCategory,
      );
    });

    it('should throw NotFoundException when the new category does not exist', async () => {
      const data = {
        categoryId: 'category-inexistent',
      } as any;

      servicesRepositoryMock.getById.mockResolvedValue(serviceEntity);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue(null);

      await expect(service.update(serviceId, data)).rejects.toThrow(
        NotFoundException,
      );

      expect(servicesRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new category is inactive', async () => {
      const data = {
        categoryId: 'category-inactive',
      } as any;

      servicesRepositoryMock.getById.mockResolvedValue(serviceEntity);

      categoriesRepositoryMock.getCategoryById.mockResolvedValue({
        ...category,
        isActive: false,
      });

      await expect(service.update(serviceId, data)).rejects.toThrow(
        ConflictException,
      );

      expect(servicesRepositoryMock.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate the service and return the updated service', async () => {
      const deactivatedService = {
        ...serviceEntity,
        isActive: false,
      };

      servicesRepositoryMock.getById
        .mockResolvedValueOnce(serviceEntity)
        .mockResolvedValueOnce(deactivatedService);

      servicesRepositoryMock.deactivate.mockResolvedValue(undefined);

      const result = await service.deactivate(serviceId);

      expect(servicesRepositoryMock.getById).toHaveBeenCalledTimes(2);

      expect(servicesRepositoryMock.deactivate).toHaveBeenCalledWith(serviceId);

      expect(result).toBe(deactivatedService);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      servicesRepositoryMock.getById.mockResolvedValue(null);

      await expect(service.deactivate(serviceId)).rejects.toThrow(
        NotFoundException,
      );

      expect(servicesRepositoryMock.deactivate).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should reactivate the service and return the updated service', async () => {
      const reactivatedService = {
        ...serviceEntity,
        isActive: true,
      };

      servicesRepositoryMock.getById
        .mockResolvedValueOnce({
          ...serviceEntity,
          isActive: false,
        })
        .mockResolvedValueOnce(reactivatedService);

      servicesRepositoryMock.reactivate.mockResolvedValue(undefined);

      const result = await service.reactivate(serviceId);

      expect(servicesRepositoryMock.getById).toHaveBeenCalledTimes(2);

      expect(servicesRepositoryMock.reactivate).toHaveBeenCalledWith(serviceId);

      expect(result).toBe(reactivatedService);
    });

    it('should throw NotFoundException when the service does not exist', async () => {
      servicesRepositoryMock.getById.mockResolvedValue(null);

      await expect(service.reactivate(serviceId)).rejects.toThrow(
        NotFoundException,
      );

      expect(servicesRepositoryMock.reactivate).not.toHaveBeenCalled();
    });
  });

  describe('getProfessionalsByService', () => {
    it('should return professionals associated with the service', async () => {
      const response = [
        {
          professionalId: 'professional-123',
          serviceId,
          professional: {
            id: 'professional-123',
          },
        },
      ];

      servicesRepositoryMock.getProfessionalsByService.mockResolvedValue(
        response,
      );

      const result = await service.getProfessionalsByService(serviceId);

      expect(result).toBe(response);

      expect(
        servicesRepositoryMock.getProfessionalsByService,
      ).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('updateServiceImage', () => {
    it('should upload the image to Cloudinary and update the service', async () => {
      const file = {
        originalname: 'service.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image'),
      } as Express.Multer.File;

      const cloudinaryUrl =
        'https://res.cloudinary.com/demo/image/upload/service.jpg';

      cloudinaryServiceMock.uploadImage.mockResolvedValue({
        secure_url: cloudinaryUrl,
      });

      servicesRepositoryMock.updateServiceImage.mockResolvedValue({
        ...serviceEntity,
        imageUrl: cloudinaryUrl,
      });

      const result = await service.updateServiceImage(serviceId, file);

      expect(cloudinaryServiceMock.uploadImage).toHaveBeenCalledWith(
        file,
        'turnify/services',
      );

      expect(servicesRepositoryMock.updateServiceImage).toHaveBeenCalledWith(
        serviceId,
        cloudinaryUrl,
      );

      expect(result).toEqual({
        ...serviceEntity,
        imageUrl: cloudinaryUrl,
      });
    });
  });
});
