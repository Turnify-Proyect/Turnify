import { Repository } from 'typeorm';

import { AvailabilityRepository } from './availability.repository';
import { Availability, DayOfWeek } from './entities/availability.entity';
import { Professional } from '../professionals/entities/professional.entity';

describe('AvailabilityRepository', () => {
let repository: AvailabilityRepository;
let ormAvailabilityRepository: jest.Mocked<Repository<Availability>>;

beforeEach(() => {
ormAvailabilityRepository = {
findOne: jest.fn(),
find: jest.fn(),
update: jest.fn(),
create: jest.fn(),
save: jest.fn(),
delete: jest.fn(),
} as unknown as jest.Mocked<Repository<Availability>>;

repository = new AvailabilityRepository(
  ormAvailabilityRepository,
);


});

afterEach(() => {
jest.clearAllMocks();
});

describe('getById', () => {
it('should find an availability by id including the professional relation', async () => {
const id = 'availability-uuid';

  const availability = {
    id,
    professional: {
      id: 'professional-uuid',
    },
  } as Availability;

  ormAvailabilityRepository.findOne.mockResolvedValue(
    availability,
  );

  const result = await repository.getById(id);

  expect(ormAvailabilityRepository.findOne).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.findOne).toHaveBeenCalledWith({
    where: {
      id,
    },
    relations: {
      professional: true,
    },
  });

  expect(result).toEqual(availability);
});

it('should return null when the availability does not exist', async () => {
  ormAvailabilityRepository.findOne.mockResolvedValue(null);

  const result = await repository.getById(
    'non-existent-id',
  );

  expect(result).toBeNull();

  expect(ormAvailabilityRepository.findOne).toHaveBeenCalledWith({
    where: {
      id: 'non-existent-id',
    },
    relations: {
      professional: true,
    },
  });
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  ormAvailabilityRepository.findOne.mockRejectedValue(error);

  await expect(
    repository.getById('availability-uuid'),
  ).rejects.toThrow(error);
});


});

describe('getByProfessionalId', () => {
it('should return all availabilities belonging to a professional', async () => {
const professionalId = 'professional-uuid';

  const availabilities = [
    {
      id: 'availability-1',
      professional: {
        id: professionalId,
      },
    },
    {
      id: 'availability-2',
      professional: {
        id: professionalId,
      },
    },
  ] as Availability[];

  ormAvailabilityRepository.find.mockResolvedValue(
    availabilities,
  );

  const result = await repository.getByProfessionalId(
    professionalId,
  );

  expect(ormAvailabilityRepository.find).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.find).toHaveBeenCalledWith({
    where: {
      professional: {
        id: professionalId,
      },
    },
  });

  expect(result).toEqual(availabilities);
});

it('should return an empty array when the professional has no availabilities', async () => {
  ormAvailabilityRepository.find.mockResolvedValue([]);

  const result = await repository.getByProfessionalId(
    'professional-without-availability',
  );

  expect(result).toEqual([]);

  expect(ormAvailabilityRepository.find).toHaveBeenCalledWith({
    where: {
      professional: {
        id: 'professional-without-availability',
      },
    },
  });
});

it('should propagate repository errors', async () => {
  const error = new Error('Database unavailable');

  ormAvailabilityRepository.find.mockRejectedValue(error);

  await expect(
    repository.getByProfessionalId('professional-uuid'),
  ).rejects.toThrow(error);
});


});

describe('getByProfessionalAndDay', () => {
it('should find availabilities for a professional on a specific day', async () => {
const professionalId = 'professional-uuid';
const dayOfWeek = DayOfWeek.MONDAY;

  const availabilities = [
    {
      id: 'availability-1',
      dayOfWeek,
      startTime: '09:00',
      endTime: '12:00',
    },
    {
      id: 'availability-2',
      dayOfWeek,
      startTime: '14:00',
      endTime: '18:00',
    },
  ] as Availability[];

  ormAvailabilityRepository.find.mockResolvedValue(
    availabilities,
  );

  const result = await repository.getByProfessionalAndDay(
    professionalId,
    dayOfWeek,
  );

  expect(ormAvailabilityRepository.find).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.find).toHaveBeenCalledWith({
    where: {
      professional: {
        id: professionalId,
      },
      dayOfWeek,
    },
  });

  expect(result).toEqual(availabilities);
});

it('should return an empty array when there are no availabilities for that day', async () => {
  ormAvailabilityRepository.find.mockResolvedValue([]);

  const result = await repository.getByProfessionalAndDay(
    'professional-uuid',
    DayOfWeek.MONDAY,
  );

  expect(result).toEqual([]);

  expect(ormAvailabilityRepository.find).toHaveBeenCalledWith({
    where: {
      professional: {
        id: 'professional-uuid',
      },
      dayOfWeek: DayOfWeek.MONDAY,
    },
  });
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  ormAvailabilityRepository.find.mockRejectedValue(error);

  await expect(
    repository.getByProfessionalAndDay(
      'professional-uuid',
      DayOfWeek.MONDAY,
    ),
  ).rejects.toThrow(error);
});


});

describe('update', () => {
it('should update an availability with the provided data', async () => {
const id = 'availability-uuid';

  const data = {
    dayOfWeek: DayOfWeek.TUESDAY,
    startTime: '10:00',
    endTime: '18:00',
  } as any;

  ormAvailabilityRepository.update.mockResolvedValue(
    {} as any,
  );

  const result = await repository.update(id, data);

  expect(ormAvailabilityRepository.update).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.update).toHaveBeenCalledWith(
    id,
    data,
  );

  expect(result).toBeUndefined();
});

it('should pass partial update data without modifying it', async () => {
  const id = 'availability-uuid';

  const data = {
    startTime: '11:00',
  } as any;

  await repository.update(id, data);

  expect(ormAvailabilityRepository.update).toHaveBeenCalledWith(
    id,
    data,
  );
});

it('should propagate repository errors', async () => {
  const error = new Error('Update failed');

  ormAvailabilityRepository.update.mockRejectedValue(error);

  await expect(
    repository.update(
      'availability-uuid',
      {} as any,
    ),
  ).rejects.toThrow(error);
});


});

describe('create', () => {
it('should create and save an availability associated with the professional', async () => {
const professionalId = 'professional-uuid';

  const data = {
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '09:00',
    endTime: '17:00',
  } as any;

  const availability = {
    id: 'availability-uuid',
    ...data,
    professional: {
      id: professionalId,
    },
  } as Availability;

  ormAvailabilityRepository.create.mockReturnValue(
    availability,
  );

  ormAvailabilityRepository.save.mockResolvedValue(
    availability,
  );

  const result = await repository.create(
    professionalId,
    data,
  );

  expect(ormAvailabilityRepository.create).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.create).toHaveBeenCalledWith({
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    professional: {
      id: professionalId,
    },
  });

  expect(ormAvailabilityRepository.save).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.save).toHaveBeenCalledWith(
    availability,
  );

  expect(result).toEqual(availability);
});

it('should use only the expected fields from the DTO', async () => {
  const professionalId = 'professional-uuid';

  const data = {
    dayOfWeek: DayOfWeek.WEDNESDAY,
    startTime: '08:00',
    endTime: '12:00',
    unexpectedField: 'should-not-be-persisted',
  } as any;

  const availability = {
    id: 'availability-uuid',
  } as Availability;

  ormAvailabilityRepository.create.mockReturnValue(
    availability,
  );

  ormAvailabilityRepository.save.mockResolvedValue(
    availability,
  );

  await repository.create(
    professionalId,
    data,
  );

  expect(ormAvailabilityRepository.create).toHaveBeenCalledWith({
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    professional: {
      id: professionalId,
    },
  });
});

it('should propagate errors from create', async () => {
  const error = new Error('Create failed');

  ormAvailabilityRepository.create.mockImplementation(() => {
    throw error;
  });

  await expect(
    repository.create(
      'professional-uuid',
      {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '17:00',
      } as any,
    ),
  ).rejects.toThrow(error);

  expect(ormAvailabilityRepository.save).not.toHaveBeenCalled();
});

it('should propagate errors from save', async () => {
  const availability = {
    id: 'availability-uuid',
  } as Availability;

  const error = new Error('Save failed');

  ormAvailabilityRepository.create.mockReturnValue(
    availability,
  );

  ormAvailabilityRepository.save.mockRejectedValue(error);

  await expect(
    repository.create(
      'professional-uuid',
      {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '17:00',
      } as any,
    ),
  ).rejects.toThrow(error);

  expect(ormAvailabilityRepository.create).toHaveBeenCalled();
  expect(ormAvailabilityRepository.save).toHaveBeenCalledWith(
    availability,
  );
});


});

describe('delete', () => {
it('should delete an availability by id', async () => {
const id = 'availability-uuid';

  ormAvailabilityRepository.delete.mockResolvedValue(
    {} as any,
  );

  const result = await repository.delete(id);

  expect(ormAvailabilityRepository.delete).toHaveBeenCalledTimes(1);

  expect(ormAvailabilityRepository.delete).toHaveBeenCalledWith(
    id,
  );

  expect(result).toBeUndefined();
});

it('should propagate repository errors', async () => {
  const error = new Error('Delete failed');

  ormAvailabilityRepository.delete.mockRejectedValue(error);

  await expect(
    repository.delete('availability-uuid'),
  ).rejects.toThrow(error);
});


});
});