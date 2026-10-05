import { AvailabilityRepository } from './availability.repository';
import { Availability, DayOfWeek } from './entities/availability.entity';
import { Repository } from 'typeorm';

describe('AvailabilityRepository', () => {
  let repository: AvailabilityRepository;
  let ormRepository: jest.Mocked<Repository<Availability>>;

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Availability>>;

    repository = new AvailabilityRepository(ormRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return an availability by id with the professional relation', async () => {
      const availability = {
        id: 'availability-1',
        startTime: '09:00:00',
        endTime: '13:00:00',
        dayOfWeek: DayOfWeek.MONDAY,
      } as Availability;

      ormRepository.findOne.mockResolvedValue(availability);

      const result = await repository.getById('availability-1');

      expect(ormRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'availability-1',
        },
        relations: {
          professional: true,
        },
      });

      expect(result).toEqual(availability);
    });

    it('should return null when the availability does not exist', async () => {
      ormRepository.findOne.mockResolvedValue(null);

      const result = await repository.getById('non-existent-id');

      expect(ormRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'non-existent-id',
        },
        relations: {
          professional: true,
        },
      });

      expect(result).toBeNull();
    });
  });

  describe('getByProfessionalId', () => {
    it('should return all availabilities of a professional', async () => {
      const availabilities = [
        {
          id: 'availability-1',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '13:00:00',
        },
        {
          id: 'availability-2',
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: '14:00:00',
          endTime: '18:00:00',
        },
      ] as Availability[];

      ormRepository.find.mockResolvedValue(availabilities);

      const result = await repository.getByProfessionalId('professional-1');

      expect(ormRepository.find).toHaveBeenCalledWith({
        where: {
          professional: {
            id: 'professional-1',
          },
        },
      });

      expect(result).toEqual(availabilities);
    });

    it('should return an empty array when the professional has no availabilities', async () => {
      ormRepository.find.mockResolvedValue([]);

      const result = await repository.getByProfessionalId('professional-1');

      expect(result).toEqual([]);
    });
  });

  describe('getByProfessionalAndDay', () => {
    it('should return availabilities for a professional on a specific day', async () => {
      const availabilities = [
        {
          id: 'availability-1',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '13:00:00',
        },
      ] as Availability[];

      ormRepository.find.mockResolvedValue(availabilities);

      const result = await repository.getByProfessionalAndDay(
        'professional-1',
        DayOfWeek.MONDAY,
      );

      expect(ormRepository.find).toHaveBeenCalledWith({
        where: {
          professional: {
            id: 'professional-1',
          },
          dayOfWeek: DayOfWeek.MONDAY,
        },
      });

      expect(result).toEqual(availabilities);
    });

    it('should return an empty array when there are no availabilities for that day', async () => {
      ormRepository.find.mockResolvedValue([]);

      const result = await repository.getByProfessionalAndDay(
        'professional-1',
        DayOfWeek.FRIDAY,
      );

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an availability', async () => {
      const updateData = {
        startTime: '10:00',
        endTime: '14:00',
      };

      ormRepository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: {},
      });

      await repository.update('availability-1', updateData);

      expect(ormRepository.update).toHaveBeenCalledWith(
        'availability-1',
        updateData,
      );
    });
  });

  describe('create', () => {
    it('should create and save an availability associated with the professional', async () => {
      const createData = {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '13:00',
      };

      const availability = {
        id: 'availability-1',
        ...createData,
        professional: {
          id: 'professional-1',
        },
      } as Availability;

      ormRepository.create.mockReturnValue(availability);
      ormRepository.save.mockResolvedValue(availability);

      const result = await repository.create('professional-1', createData);

      expect(ormRepository.create).toHaveBeenCalledWith({
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '13:00',
        professional: {
          id: 'professional-1',
        },
      });

      expect(ormRepository.save).toHaveBeenCalledWith(availability);

      expect(result).toEqual(availability);
    });
  });

  describe('delete', () => {
    it('should delete an availability by id', async () => {
      ormRepository.delete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      await repository.delete('availability-1');

      expect(ormRepository.delete).toHaveBeenCalledWith('availability-1');
    });
  });
});
