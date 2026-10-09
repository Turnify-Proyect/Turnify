import { Reflector } from '@nestjs/core';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { UserRole } from '../common/userRoles.enum';

describe('ServicesController', () => {
  let controller: ServicesController;

  let servicesServiceMock: {
    getAll: jest.Mock;
    getAllActive: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    deactivate: jest.Mock;
    reactivate: jest.Mock;
    getProfessionalsByService: jest.Mock;
    updateServiceImage: jest.Mock;
  };

  const serviceId = 'service-123';
  const professionalId = 'professional-123';

  beforeEach(() => {
    jest.clearAllMocks();

    servicesServiceMock = {
      getAll: jest.fn(),
      getAllActive: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deactivate: jest.fn(),
      reactivate: jest.fn(),
      getProfessionalsByService: jest.fn(),
      updateServiceImage: jest.fn(),
    };

    controller = new ServicesController(
      servicesServiceMock as unknown as ServicesService,
    );
  });

  describe('getAll', () => {
    it('should return all services', async () => {
      const response = [
        {
          id: serviceId,
          name: 'Masajes',
          isActive: true,
        },
        {
          id: 'service-456',
          name: 'Pedicuría',
          isActive: false,
        },
      ];

      servicesServiceMock.getAll.mockResolvedValue(response);

      const result = await controller.getAll();

      expect(result).toBe(response);

      expect(servicesServiceMock.getAll).toHaveBeenCalled();
    });
  });

  describe('getAllActive', () => {
    it('should return active services', async () => {
      const response = [
        {
          id: serviceId,
          name: 'Masajes',
          isActive: true,
        },
      ];

      servicesServiceMock.getAllActive.mockResolvedValue(response);

      const result = await controller.getAllActive();

      expect(result).toBe(response);

      expect(servicesServiceMock.getAllActive).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return the service', async () => {
      const response = {
        id: serviceId,
        name: 'Masajes',
        isActive: true,
      };

      servicesServiceMock.getById.mockResolvedValue(response);

      const result = await controller.getById(serviceId);

      expect(result).toBe(response);

      expect(servicesServiceMock.getById).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('update', () => {
    it('should update the service', async () => {
      const data = {
        name: 'Masajes relajantes',
        price: '15000',
      };

      const response = {
        id: serviceId,
        name: 'Masajes relajantes',
        price: '15000',
      };

      servicesServiceMock.update.mockResolvedValue(response);

      const result = await controller.update(serviceId, data as any);

      expect(result).toBe(response);

      expect(servicesServiceMock.update).toHaveBeenCalledWith(serviceId, data);
    });
  });

  describe('create', () => {
    it('should create a service', async () => {
      const data = {
        name: 'Masajes',
        description: 'Masaje relajante',
        price: '10000',
        durationMinutes: 60,
        categoryId: 'category-123',
      };

      const response = {
        id: serviceId,
        ...data,
      };

      servicesServiceMock.create.mockResolvedValue(response);

      const result = await controller.create(data as any);

      expect(result).toBe(response);

      expect(servicesServiceMock.create).toHaveBeenCalledWith(data);
    });
  });

  describe('deactivate', () => {
    it('should deactivate the service', async () => {
      const response = {
        id: serviceId,
        isActive: false,
      };

      servicesServiceMock.deactivate.mockResolvedValue(response);

      const result = await controller.deactivate(serviceId);

      expect(result).toBe(response);

      expect(servicesServiceMock.deactivate).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('reactivate', () => {
    it('should reactivate the service', async () => {
      const response = {
        id: serviceId,
        isActive: true,
      };

      servicesServiceMock.reactivate.mockResolvedValue(response);

      const result = await controller.reactivate(serviceId);

      expect(result).toBe(response);

      expect(servicesServiceMock.reactivate).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('getProfessionalsByService', () => {
    it('should return professionals associated with the service', async () => {
      const response = [
        {
          professionalId,
          serviceId,
        },
      ];

      servicesServiceMock.getProfessionalsByService.mockResolvedValue(response);

      const result = await controller.getProfessionalsByService(serviceId);

      expect(result).toBe(response);

      expect(
        servicesServiceMock.getProfessionalsByService,
      ).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('uploadServiceImage', () => {
    it('should update the service image', async () => {
      const file = {
        originalname: 'service.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const response = {
        id: serviceId,
        imageUrl: 'https://res.cloudinary.com/test/service.png',
      };

      servicesServiceMock.updateServiceImage.mockResolvedValue(response);

      const result = await controller.uploadServiceImage(serviceId, file);

      expect(result).toBe(response);

      expect(servicesServiceMock.updateServiceImage).toHaveBeenCalledWith(
        serviceId,
        file,
      );
    });
  });

  describe('authorization metadata', () => {
    const reflector = new Reflector();
    const ROLES_KEY = 'roles';

    it('should require ADMIN role for getAll', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.getAll,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should not require a role for getAllActive', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.getAllActive,
      );

      expect(roles).toBeUndefined();
    });

    it('should not require a role for getById', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.getById,
      );

      expect(roles).toBeUndefined();
    });

    it('should require ADMIN role for update', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.update,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for create', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.create,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for deactivate', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.deactivate,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for reactivate', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.reactivate,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should not require a role for getProfessionalsByService', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.getProfessionalsByService,
      );

      expect(roles).toBeUndefined();
    });

    it('should require ADMIN role for uploadServiceImage', () => {
      const roles = reflector.get(
        ROLES_KEY,
        ServicesController.prototype.uploadServiceImage,
      );

      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
