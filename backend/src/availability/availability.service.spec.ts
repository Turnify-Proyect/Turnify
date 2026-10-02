import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityRepository } from './availability.repository';
import { DayOfWeek } from './entities/availability.entity';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let availabilityRepository: jest.Mocked<AvailabilityRepository>;

  beforeEach(() => {
    availabilityRepository = {
      getByProfessionalId: jest.fn(),
      getByProfessionalAndDay: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AvailabilityRepository>;

    service = new AvailabilityService(availabilityRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByProfessionalId', () => {
    it('should return the professional availabilities', async () => {
      const availabilities = [
        {
          id: '1',
          startTime: '09:00:00',
          endTime: '13:00:00',
          dayOfWeek: DayOfWeek.MONDAY,
        },
        {
          id: '2',
          startTime: '14:00:00',
          endTime: '18:00:00',
          dayOfWeek: DayOfWeek.MONDAY,
        },
      ] as Availability[];

      availabilityRepository.getByProfessionalId.mockResolvedValue(
        availabilities,
      );

      const result = await service.getByProfessionalId('professional-1');

      expect(result).toEqual(availabilities);
      expect(
        availabilityRepository.getByProfessionalId,
      ).toHaveBeenCalledWith('professional-1');
    });
  });

  describe('create', () => {
    const createData = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '13:00',
    };

    it('should create an availability', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);

      const createdAvailability = {
        id: '1',
        ...createData,
      } as Availability;

      availabilityRepository.create.mockResolvedValue(createdAvailability);

      const result = await service.create('professional-1', createData);

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).toHaveBeenCalledWith(
        'professional-1',
        DayOfWeek.MONDAY,
      );

      expect(availabilityRepository.create).toHaveBeenCalledWith(
        'professional-1',
        createData,
      );

      expect(result).toEqual(createdAvailability);
    });

    it('should throw BadRequestException when start time is equal to end time', async () => {
      const data = {
        ...createData,
        startTime: '09:00',
        endTime: '09:00',
      };

      await expect(
        service.create('professional-1', data),
      ).rejects.toThrow(
        new BadRequestException(
          'La hora de inicio debe ser anterior a la hora de finalización',
        ),
      );

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).not.toHaveBeenCalled();

      expect(availabilityRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when start time is after end time', async () => {
      const data = {
        ...createData,
        startTime: '14:00',
        endTime: '09:00',
      };

      await expect(
        service.create('professional-1', data),
      ).rejects.toThrow(
        'La hora de inicio debe ser anterior a la hora de finalización',
      );

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).not.toHaveBeenCalled();

      expect(availabilityRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new range overlaps an existing availability', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          id: 'existing-1',
          startTime: '10:00:00',
          endTime: '14:00:00',
        },
      ] as Availability[]);

      const data = {
        ...createData,
        startTime: '13:00',
        endTime: '16:00',
      };

      await expect(
        service.create('professional-1', data),
      ).rejects.toThrow(
        new ConflictException(
          'Availability overlaps with an existing time range',
        ),
      );

      expect(availabilityRepository.create).not.toHaveBeenCalled();
    });

    it('should allow a range that ends exactly when another starts', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          id: 'existing-1',
          startTime: '14:00:00',
          endTime: '18:00:00',
        },
      ] as Availability[]);

      const data = {
        ...createData,
        startTime: '09:00',
        endTime: '14:00',
      };

      const createdAvailability = {
        id: 'new-availability',
        ...data,
      } as Availability;

      availabilityRepository.create.mockResolvedValue(createdAvailability);

      const result = await service.create('professional-1', data);

      expect(result).toEqual(createdAvailability);
      expect(availabilityRepository.create).toHaveBeenCalledWith(
        'professional-1',
        data,
      );
    });

    it('should allow a range that starts exactly when another ends', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          id: 'existing-1',
          startTime: '09:00:00',
          endTime: '13:00:00',
        },
      ] as Availability[]);

      const data = {
        ...createData,
        startTime: '13:00',
        endTime: '17:00',
      };

      const createdAvailability = {
        id: 'new-availability',
        ...data,
      } as Availability;

      availabilityRepository.create.mockResolvedValue(createdAvailability);

      const result = await service.create('professional-1', data);

      expect(result).toEqual(createdAvailability);
    });

    it('should normalize HH:mm:ss values when checking overlap', async () => {
      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        {
          id: 'existing-1',
          startTime: '09:00:00',
          endTime: '13:00:00',
        },
      ] as Availability[]);

      const data = {
        ...createData,
        startTime: '12:30:00',
        endTime: '14:00:00',
      };

      await expect(
        service.create('professional-1', data),
      ).rejects.toThrow(ConflictException);

      expect(availabilityRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingAvailability = {
      id: 'availability-1',
      startTime: '09:00:00',
      endTime: '13:00:00',
      dayOfWeek: DayOfWeek.MONDAY,
      professional: {
        id: 'professional-1',
      },
    } as Availability;

    it('should throw BadRequestException when no data is provided', async () => {
      await expect(
        service.update('availability-1', {}),
      ).rejects.toThrow(
        new BadRequestException(
          'No se proporcionaron datos para actualizar',
        ),
      );

      expect(availabilityRepository.getById).not.toHaveBeenCalled();
      expect(availabilityRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the availability does not exist', async () => {
      availabilityRepository.getById.mockResolvedValue(null);

      await expect(
        service.update('availability-1', {
          startTime: '10:00',
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'No se encontró la disponibilidad con id availability-1',
        ),
      );

      expect(availabilityRepository.update).not.toHaveBeenCalled();
    });

    it('should update the availability using existing values for omitted fields', async () => {
      availabilityRepository.getById
        .mockResolvedValueOnce(existingAvailability)
        .mockResolvedValueOnce({
          ...existingAvailability,
          startTime: '10:00',
        } as Availability);

      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);

      const updateData = {
        startTime: '10:00',
      };

      const result = await service.update(
        'availability-1',
        updateData,
      );

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).toHaveBeenCalledWith(
        'professional-1',
        DayOfWeek.MONDAY,
      );

      expect(availabilityRepository.update).toHaveBeenCalledWith(
        'availability-1',
        updateData,
      );

      expect(result).toEqual({
        ...existingAvailability,
        startTime: '10:00',
      });
    });

    it('should update the day when dayOfWeek is provided', async () => {
      availabilityRepository.getById
        .mockResolvedValueOnce(existingAvailability)
        .mockResolvedValueOnce({
          ...existingAvailability,
          dayOfWeek: DayOfWeek.TUESDAY,
        } as Availability);

      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);

      const updateData = {
        dayOfWeek: DayOfWeek.TUESDAY,
      };

      await service.update('availability-1', updateData);

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).toHaveBeenCalledWith(
        'professional-1',
        DayOfWeek.TUESDAY,
      );

      expect(availabilityRepository.update).toHaveBeenCalledWith(
        'availability-1',
        updateData,
      );
    });

    it('should ignore the current availability when checking overlap', async () => {
      availabilityRepository.getById
        .mockResolvedValueOnce(existingAvailability)
        .mockResolvedValueOnce(existingAvailability);

      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        existingAvailability,
      ]);

      const updateData = {
        startTime: '10:00',
        endTime: '12:00',
      };

      const result = await service.update(
        'availability-1',
        updateData,
      );

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).toHaveBeenCalledWith(
        'professional-1',
        DayOfWeek.MONDAY,
      );

      expect(result).toEqual(existingAvailability);
      expect(availabilityRepository.update).toHaveBeenCalledWith(
        'availability-1',
        updateData,
      );
    });

    it('should throw ConflictException when the updated range overlaps another availability', async () => {
      availabilityRepository.getById.mockResolvedValue(existingAvailability);

      availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
        existingAvailability,
        {
          id: 'availability-2',
          startTime: '14:00:00',
          endTime: '18:00:00',
        },
      ] as Availability[]);

      const updateData = {
        startTime: '13:00',
        endTime: '15:00',
      };

      await expect(
        service.update('availability-1', updateData),
      ).rejects.toThrow(
        new ConflictException(
          'Availability overlaps with an existing time range',
        ),
      );

      expect(availabilityRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when updated start time is after end time', async () => {
      availabilityRepository.getById.mockResolvedValue(existingAvailability);

      const updateData = {
        startTime: '15:00',
        endTime: '10:00',
      };

      await expect(
        service.update('availability-1', updateData),
      ).rejects.toThrow(
        'La hora de inicio debe ser anterior a la hora de finalización',
      );

      expect(
        availabilityRepository.getByProfessionalAndDay,
      ).not.toHaveBeenCalled();

      expect(availabilityRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an existing availability', async () => {
      availabilityRepository.getById.mockResolvedValue({
        id: 'availability-1',
      } as Availability);

      availabilityRepository.delete.mockResolvedValue(undefined);

      await expect(
        service.delete('availability-1'),
      ).resolves.toBeUndefined();

      expect(availabilityRepository.getById).toHaveBeenCalledWith(
        'availability-1',
      );

      expect(availabilityRepository.delete).toHaveBeenCalledWith(
        'availability-1',
      );
    });

    it('should throw NotFoundException when the availability does not exist', async () => {
      availabilityRepository.getById.mockResolvedValue(null);

      await expect(
        service.delete('availability-1'),
      ).rejects.toThrow(
        new NotFoundException(
          'No se encontró la disponibilidad con id availability-1',
        ),
      );

      expect(availabilityRepository.delete).not.toHaveBeenCalled();
    });
  });
});