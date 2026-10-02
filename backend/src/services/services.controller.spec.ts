import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

describe('ServicesController', () => {
  let controller: ServicesController;

  const servicesServiceMock = {
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

  const jwtServiceMock = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: servicesServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  describe('getAll', () => {
    it('should return all services', async () => {
      const services = [
        {
          id: 'service-1',
          name: 'Corte de pelo',
          description: 'Servicio de corte',
        },
        {
          id: 'service-2',
          name: 'Masajes',
          description: 'Servicio de masajes',
        },
      ];

      servicesServiceMock.getAll.mockResolvedValue(services);

      const result = await controller.getAll();

      expect(servicesServiceMock.getAll).toHaveBeenCalled();
      expect(result).toEqual(services);
    });
  });

  describe('getAllActive', () => {
    it('should return only active services', async () => {
      const services = [
        {
          id: 'service-1',
          name: 'Corte de pelo',
          isActive: true,
        },
        {
          id: 'service-2',
          name: 'Masajes',
          isActive: true,
        },
      ];

      servicesServiceMock.getAllActive.mockResolvedValue(services);

      const result = await controller.getAllActive();

      expect(servicesServiceMock.getAllActive).toHaveBeenCalled();
      expect(result).toEqual(services);
    });
  });

  describe('getById', () => {
    it('should return a service by id', async () => {
      const id = 'service-1';

      const service = {
        id,
        name: 'Corte de pelo',
        description: 'Servicio de corte',
      };

      servicesServiceMock.getById.mockResolvedValue(service);

      const result = await controller.getById(id);

      expect(servicesServiceMock.getById).toHaveBeenCalledWith(id);
      expect(result).toEqual(service);
    });

    it('should propagate service errors', async () => {
      const id = 'service-inexistente';

      const error = new Error('Servicio no encontrado');

      servicesServiceMock.getById.mockRejectedValue(error);

      await expect(controller.getById(id)).rejects.toThrow(
        'Servicio no encontrado',
      );

      expect(servicesServiceMock.getById).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a service', async () => {
      const id = 'service-1';

      const dto = {
        name: 'Corte actualizado',
        description: 'Descripción actualizada',
      } as any;

      const expectedResult = {
        id,
        ...dto,
      };

      servicesServiceMock.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, dto);

      expect(servicesServiceMock.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('create', () => {
    it('should create a service', async () => {
      const dto = {
        name: 'Nuevo servicio',
        description: 'Descripción del nuevo servicio',
      } as any;

      const expectedResult = {
        id: 'service-1',
        ...dto,
      };

      servicesServiceMock.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(servicesServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a service', async () => {
      const id = 'service-1';

      const expectedResult = {
        message: 'Servicio desactivado correctamente',
      };

      servicesServiceMock.deactivate.mockResolvedValue(expectedResult);

      const result = await controller.deactivate(id);

      expect(servicesServiceMock.deactivate).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('reactivate', () => {
    it('should reactivate a service', async () => {
      const id = 'service-1';

      const expectedResult = {
        message: 'Servicio activado correctamente',
      };

      servicesServiceMock.reactivate.mockResolvedValue(expectedResult);

      const result = await controller.reactivate(id);

      expect(servicesServiceMock.reactivate).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfessionalsByService', () => {
    it('should return professionals associated with a service', async () => {
      const serviceId = 'service-1';

      const professionals = [
        {
          id: 'user-1',
          name: 'Juan',
        },
        {
          id: 'user-2',
          name: 'Pedro',
        },
      ];

      servicesServiceMock.getProfessionalsByService.mockResolvedValue(
        professionals,
      );

      const result =
        await controller.getProfessionalsByService(serviceId);

      expect(
        servicesServiceMock.getProfessionalsByService,
      ).toHaveBeenCalledWith(serviceId);

      expect(result).toEqual(professionals);
    });
  });

  describe('uploadServiceImage', () => {
    it('should update the service image', async () => {
      const id = 'service-1';

      const file = {
        originalname: 'service.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const expectedResult = {
        id,
        imgUrl: 'https://cloudinary.com/service.jpg',
      };

      servicesServiceMock.updateServiceImage.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.uploadServiceImage(id, file);

      expect(
        servicesServiceMock.updateServiceImage,
      ).toHaveBeenCalledWith(id, file);

      expect(result).toEqual(expectedResult);
    });

    it('should propagate errors from updateServiceImage', async () => {
      const id = 'service-1';

      const file = {
        originalname: 'service.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const error = new Error('Error al subir imagen');

      servicesServiceMock.updateServiceImage.mockRejectedValue(error);

      await expect(
        controller.uploadServiceImage(id, file),
      ).rejects.toThrow('Error al subir imagen');

      expect(
        servicesServiceMock.updateServiceImage,
      ).toHaveBeenCalledWith(id, file);
    });
  });
});