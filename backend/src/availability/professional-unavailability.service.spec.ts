import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { ProfessionalUnavailabilityRepository } from './professional-unavailability.repository';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';

describe('ProfessionalUnavailabilityService', () => {
  let service: ProfessionalUnavailabilityService;

  const repository = {
    getByProfessionalId: jest.fn(),
    getOverlapping: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalUnavailabilityService,
        {
          provide: ProfessionalUnavailabilityRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ProfessionalUnavailabilityService>(
      ProfessionalUnavailabilityService,
    );
  });

  describe('getByProfessionalId', () => {
    it('should return all unavailabilities for a professional', async () => {
      const unavailabilities = [
        {
          id: 'block-1',
          startDate: '2026-10-10',
          endDate: '2026-10-12',
        },
        {
          id: 'block-2',
          startDate: '2026-11-01',
          endDate: '2026-11-05',
        },
      ];

      repository.getByProfessionalId.mockResolvedValue(unavailabilities);

      const result = await service.getByProfessionalId('professional-id');

      expect(repository.getByProfessionalId).toHaveBeenCalledWith(
        'professional-id',
      );

      expect(result).toBe(unavailabilities);
    });

    it('should return an empty array when there are no unavailabilities', async () => {
      repository.getByProfessionalId.mockResolvedValue([]);

      const result = await service.getByProfessionalId('professional-id');

      expect(result).toEqual([]);

      expect(repository.getByProfessionalId).toHaveBeenCalledWith(
        'professional-id',
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      repository.getByProfessionalId.mockRejectedValue(error);

      await expect(
        service.getByProfessionalId('professional-id'),
      ).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const data: CreateProfessionalUnavailabilityDto = {
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      reason: 'Vacaciones',
    };

    it('should create an unavailability successfully', async () => {
      const createdUnavailability = {
        id: 'block-id',
        ...data,
        professional: {
          id: 'professional-id',
        },
      };

      repository.getOverlapping.mockResolvedValue(null);
      repository.create.mockResolvedValue(createdUnavailability);

      const result = await service.create('professional-id', data);

      expect(repository.getOverlapping).toHaveBeenCalledWith(
        'professional-id',
        '2026-10-10',
        '2026-10-15',
      );

      expect(repository.create).toHaveBeenCalledWith('professional-id', data);

      expect(result).toBe(createdUnavailability);
    });

    it('should allow a range where startDate equals endDate', async () => {
      const sameDayData: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        reason: 'Feriado',
      };

      const createdUnavailability = {
        id: 'block-id',
        ...sameDayData,
      };

      repository.getOverlapping.mockResolvedValue(null);
      repository.create.mockResolvedValue(createdUnavailability);

      const result = await service.create('professional-id', sameDayData);

      expect(repository.getOverlapping).toHaveBeenCalledWith(
        'professional-id',
        '2026-10-10',
        '2026-10-10',
      );

      expect(repository.create).toHaveBeenCalledWith(
        'professional-id',
        sameDayData,
      );

      expect(result).toBe(createdUnavailability);
    });

    it('should reject when startDate is after endDate', async () => {
      const invalidData: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-20',
        endDate: '2026-10-10',
        reason: 'Rango inválido',
      };

      await expect(
        service.create('professional-id', invalidData),
      ).rejects.toThrow(
        new BadRequestException(
          'La fecha de inicio debe ser anterior o igual a la fecha de finalización',
        ),
      );

      expect(repository.getOverlapping).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject when the new range overlaps an existing unavailability', async () => {
      const overlapping = {
        id: 'existing-block',
        startDate: '2026-10-12',
        endDate: '2026-10-18',
      };

      repository.getOverlapping.mockResolvedValue(overlapping);

      await expect(service.create('professional-id', data)).rejects.toThrow(
        new ConflictException(
          'El profesional ya posee un bloqueo dentro del rango de fechas seleccionado',
        ),
      );

      expect(repository.getOverlapping).toHaveBeenCalledWith(
        'professional-id',
        '2026-10-10',
        '2026-10-15',
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create the unavailability when there is no overlap', async () => {
      repository.getOverlapping.mockResolvedValue(null);

      const created = {
        id: 'block-id',
        ...data,
      };

      repository.create.mockResolvedValue(created);

      const result = await service.create('professional-id', data);

      expect(repository.getOverlapping).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(created);
    });

    it('should propagate errors from getOverlapping', async () => {
      const error = new Error('Overlap query failed');

      repository.getOverlapping.mockRejectedValue(error);

      await expect(service.create('professional-id', data)).rejects.toThrow(
        error,
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should propagate errors from repository.create', async () => {
      const error = new Error('Create failed');

      repository.getOverlapping.mockResolvedValue(null);
      repository.create.mockRejectedValue(error);

      await expect(service.create('professional-id', data)).rejects.toThrow(
        error,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing unavailability', async () => {
      const unavailability = {
        id: 'block-id',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
      };

      repository.getById.mockResolvedValue(unavailability);
      repository.delete.mockResolvedValue(undefined);

      const result = await service.delete('block-id');

      expect(repository.getById).toHaveBeenCalledWith('block-id');

      expect(repository.delete).toHaveBeenCalledWith('block-id');

      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the unavailability does not exist', async () => {
      repository.getById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'No se encontró el bloqueo con id non-existent-id',
        ),
      );

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should propagate errors when searching for the unavailability', async () => {
      const error = new Error('Database error');

      repository.getById.mockRejectedValue(error);

      await expect(service.delete('block-id')).rejects.toThrow(error);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should propagate errors when deleting the unavailability', async () => {
      const unavailability = {
        id: 'block-id',
      };

      const error = new Error('Delete failed');

      repository.getById.mockResolvedValue(unavailability);
      repository.delete.mockRejectedValue(error);

      await expect(service.delete('block-id')).rejects.toThrow(error);
    });
  });

  describe('getById', () => {
    it('should return the unavailability when it exists', async () => {
      const unavailability = {
        id: 'block-id',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        professional: {
          id: 'professional-id',
        },
      };

      repository.getById.mockResolvedValue(unavailability);

      const result = await service.getById('block-id');

      expect(repository.getById).toHaveBeenCalledWith('block-id');

      expect(result).toBe(unavailability);
    });

    it('should throw NotFoundException when the unavailability does not exist', async () => {
      repository.getById.mockResolvedValue(null);

      await expect(service.getById('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'No se encontró el bloqueo con id non-existent-id',
        ),
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      repository.getById.mockRejectedValue(error);

      await expect(service.getById('block-id')).rejects.toThrow(error);
    });
  });
});
