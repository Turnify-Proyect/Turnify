import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

describe('AvailabilityController', () => {
  let controller: AvailabilityController;
  let service: {
    getByProfessionalId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getByProfessionalId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        {
          provide: AvailabilityService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AvailabilityController>(AvailabilityController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByProfessionalId', () => {
    it('should return the availabilities of a professional', async () => {
      const professionalId = 'professional-1';

      const availabilities = [
        {
          id: 'availability-1',
          dayOfWeek: 'MONDAY',
          startTime: '09:00',
          endTime: '12:00',
        },
      ];

      service.getByProfessionalId.mockResolvedValue(availabilities);

      const result = await controller.getByProfessionalId(professionalId);

      expect(service.getByProfessionalId).toHaveBeenCalledWith(
        professionalId,
      );
      expect(result).toEqual(availabilities);
    });
  });

  describe('create', () => {
    it('should create an availability for a professional', async () => {
      const professionalId = 'professional-1';

      const data = {
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '12:00',
      };

      const createdAvailability = {
        id: 'availability-1',
        ...data,
        professional: {
          id: professionalId,
        },
      };

      service.create.mockResolvedValue(createdAvailability);

      const result = await controller.create(professionalId, data);

      expect(service.create).toHaveBeenCalledWith(
        professionalId,
        data,
      );
      expect(result).toEqual(createdAvailability);
    });
  });

  describe('update', () => {
    it('should update an availability', async () => {
      const id = 'availability-1';

      const data = {
        startTime: '10:00',
        endTime: '13:00',
      };

      const updatedAvailability = {
        id,
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '13:00',
      };

      service.update.mockResolvedValue(updatedAvailability);

      const result = await controller.update(id, data);

      expect(service.update).toHaveBeenCalledWith(id, data);
      expect(result).toEqual(updatedAvailability);
    });
  });

  describe('delete', () => {
    it('should delete an availability', async () => {
      const id = 'availability-1';

      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(id);

      expect(service.delete).toHaveBeenCalledWith(id);
      expect(result).toBeUndefined();
    });
  });
});