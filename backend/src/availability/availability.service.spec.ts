import {
BadRequestException,
ConflictException,
NotFoundException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityRepository } from './availability.repository';
import { Availability, DayOfWeek } from './entities/availability.entity';

describe('AvailabilityService', () => {
let service: AvailabilityService;
let availabilityRepository: {
getById: jest.Mock;
getByProfessionalId: jest.Mock;
getByProfessionalAndDay: jest.Mock;
update: jest.Mock;
create: jest.Mock;
delete: jest.Mock;
};

const professionalId = 'professional-uuid';
const availabilityId = 'availability-uuid';

const baseAvailability: Availability = {
id: availabilityId,
dayOfWeek: DayOfWeek.MONDAY,
startTime: '09:00:00',
endTime: '12:00:00',
professional: {
id: professionalId,
} as any,
} as Availability;

beforeEach(() => {
availabilityRepository = {
getById: jest.fn(),
getByProfessionalId: jest.fn(),
getByProfessionalAndDay: jest.fn(),
update: jest.fn(),
create: jest.fn(),
delete: jest.fn(),
};

service = new AvailabilityService(
  availabilityRepository as unknown as AvailabilityRepository,
);

});

describe('getByProfessionalId', () => {
it('should return all availabilities for a professional', async () => {
const availabilities = [baseAvailability];

  availabilityRepository.getByProfessionalId.mockResolvedValue(
    availabilities,
  );

  const result = await service.getByProfessionalId(professionalId);

  expect(
    availabilityRepository.getByProfessionalId,
  ).toHaveBeenCalledWith(professionalId);

  expect(result).toEqual(availabilities);
});

it('should return an empty array when the professional has no availabilities', async () => {
  availabilityRepository.getByProfessionalId.mockResolvedValue([]);

  const result = await service.getByProfessionalId(professionalId);

  expect(result).toEqual([]);
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  availabilityRepository.getByProfessionalId.mockRejectedValue(error);

  await expect(
    service.getByProfessionalId(professionalId),
  ).rejects.toThrow(error);
});

});

describe('getById', () => {
it('should return the availability when it exists', async () => {
availabilityRepository.getById.mockResolvedValue(baseAvailability);

  const result = await service.getById(availabilityId);

  expect(availabilityRepository.getById).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(result).toEqual(baseAvailability);
});

it('should throw NotFoundException when the availability does not exist', async () => {
  availabilityRepository.getById.mockResolvedValue(null);

  await expect(service.getById(availabilityId)).rejects.toThrow(
    NotFoundException,
  );

  await expect(service.getById(availabilityId)).rejects.toThrow(
    `No se encontró la disponibilidad con id ${availabilityId}`,
  );
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  availabilityRepository.getById.mockRejectedValue(error);

  await expect(service.getById(availabilityId)).rejects.toThrow(error);
});

});

describe('create', () => {
const createData = {
dayOfWeek: DayOfWeek.MONDAY,
startTime: '09:00',
endTime: '12:00',
};

it('should create an availability successfully', async () => {
  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.create.mockResolvedValue(baseAvailability);

  const result = await service.create(professionalId, createData);

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).toHaveBeenCalledWith(professionalId, DayOfWeek.MONDAY);

  expect(availabilityRepository.create).toHaveBeenCalledWith(
    professionalId,
    createData,
  );

  expect(result).toEqual(baseAvailability);
});

it('should reject when start time is equal to end time', async () => {
  const data = {
    ...createData,
    startTime: '10:00',
    endTime: '10:00',
  };

  await expect(service.create(professionalId, data)).rejects.toThrow(
    BadRequestException,
  );

  await expect(service.create(professionalId, data)).rejects.toThrow(
    'La hora de inicio debe ser anterior a la hora de finalización',
  );

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).not.toHaveBeenCalled();

  expect(availabilityRepository.create).not.toHaveBeenCalled();
});

it('should reject when start time is after end time', async () => {
  const data = {
    ...createData,
    startTime: '13:00',
    endTime: '09:00',
  };

  await expect(service.create(professionalId, data)).rejects.toThrow(
    BadRequestException,
  );

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).not.toHaveBeenCalled();

  expect(availabilityRepository.create).not.toHaveBeenCalled();
});

it('should reject overlapping availabilities', async () => {
  const existingAvailability = {
    ...baseAvailability,
    startTime: '10:00:00',
    endTime: '13:00:00',
  };

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    existingAvailability,
  ]);

  await expect(
    service.create(professionalId, createData),
  ).rejects.toThrow(ConflictException);

  await expect(
    service.create(professionalId, createData),
  ).rejects.toThrow(
    'Availability overlaps with an existing time range',
  );

  expect(availabilityRepository.create).not.toHaveBeenCalled();
});

it('should allow adjacent time ranges without overlap', async () => {
  const existingAvailability = {
    ...baseAvailability,
    startTime: '12:00:00',
    endTime: '14:00:00',
  };

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    existingAvailability,
  ]);

  availabilityRepository.create.mockResolvedValue(baseAvailability);

  await expect(
    service.create(professionalId, createData),
  ).resolves.toEqual(baseAvailability);

  expect(availabilityRepository.create).toHaveBeenCalledWith(
    professionalId,
    createData,
  );
});

it('should allow a range completely before an existing range', async () => {
  const existingAvailability = {
    ...baseAvailability,
    startTime: '14:00:00',
    endTime: '17:00:00',
  };

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    existingAvailability,
  ]);

  availabilityRepository.create.mockResolvedValue(baseAvailability);

  await expect(
    service.create(professionalId, createData),
  ).resolves.toEqual(baseAvailability);
});

it('should allow a range completely after an existing range', async () => {
  const existingAvailability = {
    ...baseAvailability,
    startTime: '06:00:00',
    endTime: '08:00:00',
  };

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    existingAvailability,
  ]);

  availabilityRepository.create.mockResolvedValue(baseAvailability);

  await expect(
    service.create(professionalId, createData),
  ).resolves.toEqual(baseAvailability);
});

it('should normalize PostgreSQL time values when checking overlap', async () => {
  const existingAvailability = {
    ...baseAvailability,
    startTime: '09:00:00',
    endTime: '12:00:00',
  };

  const data = {
    ...createData,
    startTime: '10:00',
    endTime: '11:00',
  };

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    existingAvailability,
  ]);

  await expect(
    service.create(professionalId, data),
  ).rejects.toThrow(ConflictException);
});

it('should propagate errors from getByProfessionalAndDay', async () => {
  const error = new Error('Database error');

  availabilityRepository.getByProfessionalAndDay.mockRejectedValue(error);

  await expect(
    service.create(professionalId, createData),
  ).rejects.toThrow(error);

  expect(availabilityRepository.create).not.toHaveBeenCalled();
});

it('should propagate errors from repository create', async () => {
  const error = new Error('Create error');

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.create.mockRejectedValue(error);

  await expect(
    service.create(professionalId, createData),
  ).rejects.toThrow(error);
});

});

describe('update', () => {
const updateData = {
startTime: '10:00',
endTime: '13:00',
};

it('should update an availability successfully', async () => {
  const updatedAvailability = {
    ...baseAvailability,
    startTime: '10:00',
    endTime: '13:00',
  };

  availabilityRepository.getById
    .mockResolvedValueOnce(baseAvailability)
    .mockResolvedValueOnce(updatedAvailability);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.update.mockResolvedValue(undefined);

  const result = await service.update(availabilityId, updateData);

  expect(availabilityRepository.getById).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).toHaveBeenCalledWith(professionalId, DayOfWeek.MONDAY);

  expect(availabilityRepository.update).toHaveBeenCalledWith(
    availabilityId,
    updateData,
  );

  expect(result).toEqual(updatedAvailability);
});

it('should reject an empty update', async () => {
  await expect(service.update(availabilityId, {})).rejects.toThrow(
    BadRequestException,
  );

  await expect(service.update(availabilityId, {})).rejects.toThrow(
    'No se proporcionaron datos para actualizar',
  );

  expect(availabilityRepository.getById).not.toHaveBeenCalled();

  expect(availabilityRepository.update).not.toHaveBeenCalled();
});

it('should reject when the availability does not exist', async () => {
  availabilityRepository.getById.mockResolvedValue(null);

  await expect(
    service.update(availabilityId, updateData),
  ).rejects.toThrow(NotFoundException);

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).not.toHaveBeenCalled();

  expect(availabilityRepository.update).not.toHaveBeenCalled();
});

it('should reject when the resulting start time is after the end time', async () => {
  const data = {
    startTime: '14:00',
    endTime: '09:00',
  };

  availabilityRepository.getById.mockResolvedValue(baseAvailability);

  await expect(service.update(availabilityId, data)).rejects.toThrow(
    BadRequestException,
  );

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).not.toHaveBeenCalled();

  expect(availabilityRepository.update).not.toHaveBeenCalled();
});

it('should reject when the resulting start and end times are equal', async () => {
  const data = {
    startTime: '10:00',
    endTime: '10:00',
  };

  availabilityRepository.getById.mockResolvedValue(baseAvailability);

  await expect(service.update(availabilityId, data)).rejects.toThrow(
    BadRequestException,
  );

  expect(availabilityRepository.update).not.toHaveBeenCalled();
});

it('should preserve existing values when they are omitted', async () => {
  const data = {
    startTime: '10:00',
  };

  const updatedAvailability = {
    ...baseAvailability,
    startTime: '10:00',
  };

  availabilityRepository.getById
    .mockResolvedValueOnce(baseAvailability)
    .mockResolvedValueOnce(updatedAvailability);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.update.mockResolvedValue(undefined);

  const result = await service.update(availabilityId, data);

  expect(availabilityRepository.update).toHaveBeenCalledWith(
    availabilityId,
    data,
  );

  expect(result).toEqual(updatedAvailability);
});

it('should use the new day when dayOfWeek is changed', async () => {
  const data = {
    dayOfWeek: DayOfWeek.TUESDAY,
  };

  const updatedAvailability = {
    ...baseAvailability,
    dayOfWeek: DayOfWeek.TUESDAY,
  };

  availabilityRepository.getById
    .mockResolvedValueOnce(baseAvailability)
    .mockResolvedValueOnce(updatedAvailability);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.update.mockResolvedValue(undefined);

  await service.update(availabilityId, data);

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).toHaveBeenCalledWith(professionalId, DayOfWeek.TUESDAY);
});

it('should ignore the current availability when checking overlap', async () => {
  availabilityRepository.getById
    .mockResolvedValueOnce(baseAvailability)
    .mockResolvedValueOnce(baseAvailability);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    baseAvailability,
  ]);

  availabilityRepository.update.mockResolvedValue(undefined);

  await expect(
    service.update(availabilityId, {
      startTime: '09:00',
      endTime: '12:00',
    }),
  ).resolves.toEqual(baseAvailability);

  expect(
    availabilityRepository.getByProfessionalAndDay,
  ).toHaveBeenCalledWith(professionalId, DayOfWeek.MONDAY);
});

it('should reject when the updated range overlaps another availability', async () => {
  const anotherAvailability = {
    ...baseAvailability,
    id: 'another-availability-id',
    startTime: '11:00:00',
    endTime: '14:00:00',
  };

  availabilityRepository.getById.mockResolvedValue(baseAvailability);
  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    baseAvailability,
    anotherAvailability,
  ]);

  await expect(
    service.update(availabilityId, {
      startTime: '10:00',
      endTime: '12:00',
    }),
  ).rejects.toThrow(ConflictException);

  expect(availabilityRepository.update).not.toHaveBeenCalled();
});

it('should allow an updated range adjacent to another availability', async () => {
  const anotherAvailability = {
    ...baseAvailability,
    id: 'another-availability-id',
    startTime: '12:00:00',
    endTime: '14:00:00',
  };

  const updatedAvailability = {
    ...baseAvailability,
    startTime: '10:00',
    endTime: '12:00',
  };

  availabilityRepository.getById
    .mockResolvedValueOnce(baseAvailability)
    .mockResolvedValueOnce(updatedAvailability);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([
    anotherAvailability,
  ]);

  availabilityRepository.update.mockResolvedValue(undefined);

  await expect(
    service.update(availabilityId, {
      startTime: '10:00',
      endTime: '12:00',
    }),
  ).resolves.toEqual(updatedAvailability);
});

it('should propagate repository errors when updating', async () => {
  const error = new Error('Update error');

  availabilityRepository.getById.mockResolvedValue(baseAvailability);
  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.update.mockRejectedValue(error);

  await expect(
    service.update(availabilityId, updateData),
  ).rejects.toThrow(error);
});

it('should propagate errors when retrieving the updated availability', async () => {
  const error = new Error('Get updated availability error');

  availabilityRepository.getById
    .mockResolvedValueOnce(baseAvailability)
    .mockRejectedValueOnce(error);

  availabilityRepository.getByProfessionalAndDay.mockResolvedValue([]);
  availabilityRepository.update.mockResolvedValue(undefined);

  await expect(
    service.update(availabilityId, updateData),
  ).rejects.toThrow(error);
});

});

describe('delete', () => {
it('should delete an existing availability', async () => {
availabilityRepository.getById.mockResolvedValue(baseAvailability);
availabilityRepository.delete.mockResolvedValue(undefined);

  await expect(
    service.delete(availabilityId),
  ).resolves.toBeUndefined();

  expect(availabilityRepository.getById).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(availabilityRepository.delete).toHaveBeenCalledWith(
    availabilityId,
  );
});

it('should throw NotFoundException when the availability does not exist', async () => {
  availabilityRepository.getById.mockResolvedValue(null);

  await expect(service.delete(availabilityId)).rejects.toThrow(
    NotFoundException,
  );

  await expect(service.delete(availabilityId)).rejects.toThrow(
    `No se encontró la disponibilidad con id ${availabilityId}`,
  );

  expect(availabilityRepository.delete).not.toHaveBeenCalled();
});

it('should propagate repository errors when searching the availability', async () => {
  const error = new Error('Database error');

  availabilityRepository.getById.mockRejectedValue(error);

  await expect(service.delete(availabilityId)).rejects.toThrow(error);

  expect(availabilityRepository.delete).not.toHaveBeenCalled();
});

it('should propagate repository errors when deleting', async () => {
  const error = new Error('Delete error');

  availabilityRepository.getById.mockResolvedValue(baseAvailability);
  availabilityRepository.delete.mockRejectedValue(error);

  await expect(service.delete(availabilityId)).rejects.toThrow(error);
});

});
});