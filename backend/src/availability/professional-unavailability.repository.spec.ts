import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfessionalUnavailabilityRepository } from './professional-unavailability.repository';
import { ProfessionalUnavailability } from './entities/professional-unavailability.entity';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';

describe('ProfessionalUnavailabilityRepository', () => {
  let repository: ProfessionalUnavailabilityRepository;

  const ormRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalUnavailabilityRepository,
        {
          provide: getRepositoryToken(ProfessionalUnavailability),
          useValue: ormRepository,
        },
      ],
    }).compile();

    repository = module.get<ProfessionalUnavailabilityRepository>(
      ProfessionalUnavailabilityRepository,
    );
  });

  describe('getById', () => {
    it('should return the unavailability by id with the professional relation', async () => {
      const unavailability = {
        id: 'unavailability-id',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        professional: {
          id: 'professional-id',
        },
      } as ProfessionalUnavailability;

      ormRepository.findOne.mockResolvedValue(unavailability);

      const result = await repository.getById('unavailability-id');

      expect(ormRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'unavailability-id',
        },
        relations: {
          professional: true,
        },
      });

      expect(result).toBe(unavailability);
    });

    it('should return null when the unavailability does not exist', async () => {
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

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      ormRepository.findOne.mockRejectedValue(error);

      await expect(repository.getById('unavailability-id')).rejects.toThrow(
        error,
      );
    });
  });

  describe('getByProfessionalId', () => {
    it('should return all unavailabilities for a professional ordered by start date', async () => {
      const unavailabilities = [
        {
          id: 'unavailability-1',
          startDate: '2026-10-10',
          endDate: '2026-10-12',
        },
        {
          id: 'unavailability-2',
          startDate: '2026-10-20',
          endDate: '2026-10-25',
        },
      ] as ProfessionalUnavailability[];

      ormRepository.find.mockResolvedValue(unavailabilities);

      const result =
        await repository.getByProfessionalId('professional-id');

      expect(ormRepository.find).toHaveBeenCalledWith({
        where: {
          professional: {
            id: 'professional-id',
          },
        },
        order: {
          startDate: 'ASC',
        },
      });

      expect(result).toBe(unavailabilities);
    });

    it('should return an empty array when the professional has no unavailabilities', async () => {
      ormRepository.find.mockResolvedValue([]);

      const result =
        await repository.getByProfessionalId('professional-id');

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      ormRepository.find.mockRejectedValue(error);

      await expect(
        repository.getByProfessionalId('professional-id'),
      ).rejects.toThrow(error);
    });
  });

  describe('getOverlapping', () => {
    it('should return an overlapping unavailability', async () => {
      const unavailability = {
        id: 'unavailability-id',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
      } as ProfessionalUnavailability;

      const getOne = jest.fn().mockResolvedValue(unavailability);
      const andWhereSecond = jest.fn().mockReturnValue({
        getOne,
      });
      const andWhereFirst = jest.fn().mockReturnValue({
        andWhere: andWhereSecond,
      });
      const where = jest.fn().mockReturnValue({
        andWhere: andWhereFirst,
      });

      ormRepository.createQueryBuilder.mockReturnValue({
        where,
      });

      const result = await repository.getOverlapping(
        'professional-id',
        '2026-10-12',
        '2026-10-20',
      );

      expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith(
        'unavailability',
      );

      expect(where).toHaveBeenCalledWith(
        'unavailability.professional_id = :professionalId',
        {
          professionalId: 'professional-id',
        },
      );

      expect(andWhereFirst).toHaveBeenCalledWith(
        'unavailability.start_date <= :endDate',
        {
          endDate: '2026-10-20',
        },
      );

      expect(andWhereSecond).toHaveBeenCalledWith(
        'unavailability.end_date >= :startDate',
        {
          startDate: '2026-10-12',
        },
      );

      expect(getOne).toHaveBeenCalled();

      expect(result).toBe(unavailability);
    });

    it('should return null when there is no overlapping unavailability', async () => {
      const getOne = jest.fn().mockResolvedValue(null);

      const andWhereSecond = jest.fn().mockReturnValue({
        getOne,
      });

      const andWhereFirst = jest.fn().mockReturnValue({
        andWhere: andWhereSecond,
      });

      const where = jest.fn().mockReturnValue({
        andWhere: andWhereFirst,
      });

      ormRepository.createQueryBuilder.mockReturnValue({
        where,
      });

      const result = await repository.getOverlapping(
        'professional-id',
        '2026-10-12',
        '2026-10-20',
      );

      expect(result).toBeNull();
      expect(getOne).toHaveBeenCalled();
    });

    it('should propagate query builder errors', async () => {
      const error = new Error('Query failed');

      const getOne = jest.fn().mockRejectedValue(error);

      const andWhereSecond = jest.fn().mockReturnValue({
        getOne,
      });

      const andWhereFirst = jest.fn().mockReturnValue({
        andWhere: andWhereSecond,
      });

      const where = jest.fn().mockReturnValue({
        andWhere: andWhereFirst,
      });

      ormRepository.createQueryBuilder.mockReturnValue({
        where,
      });

      await expect(
        repository.getOverlapping(
          'professional-id',
          '2026-10-12',
          '2026-10-20',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('should create and save a professional unavailability', async () => {
      const data: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: 'Vacaciones',
      };

      const entity = {
        id: 'unavailability-id',
        startDate: data.startDate,
        endDate: data.endDate,
        reason: 'Vacaciones',
        professional: {
          id: 'professional-id',
        },
      } as ProfessionalUnavailability;

      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      const result = await repository.create(
        'professional-id',
        data,
      );

      expect(ormRepository.create).toHaveBeenCalledWith({
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: 'Vacaciones',
        professional: {
          id: 'professional-id',
        },
      });

      expect(ormRepository.save).toHaveBeenCalledWith(entity);

      expect(result).toBe(entity);
    });

    it('should trim the reason before saving', async () => {
      const data: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: '  Vacaciones  ',
      };

      const entity = {
        id: 'unavailability-id',
      } as ProfessionalUnavailability;

      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      await repository.create('professional-id', data);

      expect(ormRepository.create).toHaveBeenCalledWith({
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: 'Vacaciones',
        professional: {
          id: 'professional-id',
        },
      });
    });

    it('should use null when the reason is not provided', async () => {
      const data: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-15',
      };

      const entity = {
        id: 'unavailability-id',
      } as ProfessionalUnavailability;

      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      await repository.create('professional-id', data);

      expect(ormRepository.create).toHaveBeenCalledWith({
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: null,
        professional: {
          id: 'professional-id',
        },
      });
    });

    it('should use null when the reason is only whitespace', async () => {
      const data: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: '   ',
      };

      const entity = {
        id: 'unavailability-id',
      } as ProfessionalUnavailability;

      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockResolvedValue(entity);

      await repository.create('professional-id', data);

      expect(ormRepository.create).toHaveBeenCalledWith({
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: null,
        professional: {
          id: 'professional-id',
        },
      });
    });

    it('should propagate errors when creating the entity', async () => {
      const data: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: 'Vacaciones',
      };

      const error = new Error('Create failed');

      ormRepository.create.mockImplementation(() => {
        throw error;
      });

      await expect(
        repository.create('professional-id', data),
      ).rejects.toThrow(error);
    });

    it('should propagate errors when saving the entity', async () => {
      const data: CreateProfessionalUnavailabilityDto = {
        startDate: '2026-10-10',
        endDate: '2026-10-15',
        reason: 'Vacaciones',
      };

      const entity = {
        id: 'unavailability-id',
      } as ProfessionalUnavailability;

      const error = new Error('Save failed');

      ormRepository.create.mockReturnValue(entity);
      ormRepository.save.mockRejectedValue(error);

      await expect(
        repository.create('professional-id', data),
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete the unavailability by id', async () => {
      ormRepository.delete.mockResolvedValue({
        affected: 1,
      });

      await repository.delete('unavailability-id');

      expect(ormRepository.delete).toHaveBeenCalledWith(
        'unavailability-id',
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Delete failed');

      ormRepository.delete.mockRejectedValue(error);

      await expect(
        repository.delete('unavailability-id'),
      ).rejects.toThrow(error);
    });
  });
});
