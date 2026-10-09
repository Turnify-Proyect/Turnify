import {
ForbiddenException,
} from '@nestjs/common';

import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { UserRole } from '../common/userRoles.enum';

describe('AvailabilityController', () => {
let controller: AvailabilityController;
let availabilityService: jest.Mocked<AvailabilityService>;
let professionalsService: jest.Mocked<ProfessionalsService>;

beforeEach(() => {
availabilityService = {
getByProfessionalId: jest.fn(),
getById: jest.fn(),
create: jest.fn(),
update: jest.fn(),
delete: jest.fn(),
} as unknown as jest.Mocked<AvailabilityService>;

professionalsService = {
  getProfessionalByUserId: jest.fn(),
} as unknown as jest.Mocked<ProfessionalsService>;

controller = new AvailabilityController(
  availabilityService,
  professionalsService,
);

});

afterEach(() => {
jest.clearAllMocks();
});

describe('getByProfessionalId', () => {
it('should call AvailabilityService.getByProfessionalId with the professional id', async () => {
const professionalId = 'professional-uuid';
const availabilities = [
{ id: 'availability-1' },
{ id: 'availability-2' },
];

  availabilityService.getByProfessionalId.mockResolvedValue(
    availabilities as never,
  );

  const result = await controller.getByProfessionalId(professionalId);

  expect(
    availabilityService.getByProfessionalId,
  ).toHaveBeenCalledTimes(1);

  expect(
    availabilityService.getByProfessionalId,
  ).toHaveBeenCalledWith(professionalId);

  expect(result).toEqual(availabilities);
});

it('should propagate errors from AvailabilityService.getByProfessionalId', async () => {
  const error = new Error('Database error');

  availabilityService.getByProfessionalId.mockRejectedValue(error);

  await expect(
    controller.getByProfessionalId('professional-uuid'),
  ).rejects.toThrow(error);
});

});

describe('create', () => {
const professionalId = 'professional-uuid';

const data = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
} as any;

it('should create availability for an admin without checking professional ownership', async () => {
  const user = {
    id: 'admin-user-id',
    roles: [UserRole.ADMIN],
  };

  const createdAvailability = {
    id: 'availability-1',
    professional: {
      id: professionalId,
    },
    ...data,
  };

  availabilityService.create.mockResolvedValue(
    createdAvailability as never,
  );

  const result = await controller.create(
    professionalId,
    data,
    { user },
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).not.toHaveBeenCalled();

  expect(availabilityService.create).toHaveBeenCalledTimes(1);
  expect(availabilityService.create).toHaveBeenCalledWith(
    professionalId,
    data,
  );

  expect(result).toEqual(createdAvailability);
});

it('should create availability for a professional when they own the professional profile', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  const professional = {
    id: professionalId,
  };

  professionalsService.getProfessionalByUserId.mockResolvedValue(
    professional as never,
  );

  const createdAvailability = {
    id: 'availability-1',
    professional,
    ...data,
  };

  availabilityService.create.mockResolvedValue(
    createdAvailability as never,
  );

  const result = await controller.create(
    professionalId,
    data,
    { user },
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).toHaveBeenCalledWith(user.id);

  expect(availabilityService.create).toHaveBeenCalledWith(
    professionalId,
    data,
  );

  expect(result).toEqual(createdAvailability);
});

it('should reject a professional trying to create availability for another professional', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  professionalsService.getProfessionalByUserId.mockResolvedValue({
    id: 'another-professional-id',
  } as never);

  await expect(
    controller.create(
      professionalId,
      data,
      { user },
    ),
  ).rejects.toThrow(
    new ForbiddenException(
      'No tenés permiso para modificar la disponibilidad de otro profesional',
    ),
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).toHaveBeenCalledWith(user.id);

  expect(availabilityService.create).not.toHaveBeenCalled();
});

it('should propagate errors when resolving the professional owner', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  const error = new Error('Professional not found');

  professionalsService.getProfessionalByUserId.mockRejectedValue(error);

  await expect(
    controller.create(
      professionalId,
      data,
      { user },
    ),
  ).rejects.toThrow(error);

  expect(availabilityService.create).not.toHaveBeenCalled();
});

it('should propagate errors from AvailabilityService.create', async () => {
  const user = {
    id: 'admin-user-id',
    roles: [UserRole.ADMIN],
  };

  const error = new Error('Create failed');

  availabilityService.create.mockRejectedValue(error);

  await expect(
    controller.create(
      professionalId,
      data,
      { user },
    ),
  ).rejects.toThrow(error);
});

it('should not check ownership when the user does not have the professional role', async () => {
  const user = {
    id: 'user-id',
    roles: [UserRole.ADMIN],
  };

  availabilityService.create.mockResolvedValue({
    id: 'availability-1',
  } as never);

  await controller.create(
    professionalId,
    data,
    { user },
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).not.toHaveBeenCalled();

  expect(availabilityService.create).toHaveBeenCalledWith(
    professionalId,
    data,
  );
});

});

describe('update', () => {
const availabilityId = 'availability-uuid';

const data = {
  startTime: '10:00',
  endTime: '18:00',
} as any;

it('should update availability when an admin owns no specific professional restriction', async () => {
  const user = {
    id: 'admin-user-id',
    roles: [UserRole.ADMIN],
  };

  const availability = {
    id: availabilityId,
    professional: {
      id: 'professional-id',
    },
  };

  availabilityService.getById.mockResolvedValue(
    availability as never,
  );

  availabilityService.update.mockResolvedValue({
    ...availability,
    ...data,
  } as never);

  const result = await controller.update(
    availabilityId,
    data,
    { user },
  );

  expect(availabilityService.getById).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).not.toHaveBeenCalled();

  expect(availabilityService.update).toHaveBeenCalledWith(
    availabilityId,
    data,
  );

  expect(result).toEqual({
    ...availability,
    ...data,
  });
});

it('should update availability when the professional owns it', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  const professionalId = 'professional-id';

  const availability = {
    id: availabilityId,
    professional: {
      id: professionalId,
    },
  };

  professionalsService.getProfessionalByUserId.mockResolvedValue({
    id: professionalId,
  } as never);

  availabilityService.getById.mockResolvedValue(
    availability as never,
  );

  availabilityService.update.mockResolvedValue({
    ...availability,
    ...data,
  } as never);

  const result = await controller.update(
    availabilityId,
    data,
    { user },
  );

  expect(availabilityService.getById).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).toHaveBeenCalledWith(user.id);

  expect(availabilityService.update).toHaveBeenCalledWith(
    availabilityId,
    data,
  );

  expect(result).toEqual({
    ...availability,
    ...data,
  });
});

it('should reject a professional updating another professional availability', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  availabilityService.getById.mockResolvedValue({
    id: availabilityId,
    professional: {
      id: 'owner-professional-id',
    },
  } as never);

  professionalsService.getProfessionalByUserId.mockResolvedValue({
    id: 'different-professional-id',
  } as never);

  await expect(
    controller.update(
      availabilityId,
      data,
      { user },
    ),
  ).rejects.toThrow(
    new ForbiddenException(
      'No tenés permiso para modificar la disponibilidad de otro profesional',
    ),
  );

  expect(availabilityService.update).not.toHaveBeenCalled();
});

it('should propagate errors from getById', async () => {
  const error = new Error('Availability not found');

  availabilityService.getById.mockRejectedValue(error);

  await expect(
    controller.update(
      availabilityId,
      data,
      {
        user: {
          id: 'admin-id',
          roles: [UserRole.ADMIN],
        },
      },
    ),
  ).rejects.toThrow(error);

  expect(availabilityService.update).not.toHaveBeenCalled();
});

it('should propagate errors from AvailabilityService.update', async () => {
  const user = {
    id: 'admin-user-id',
    roles: [UserRole.ADMIN],
  };

  availabilityService.getById.mockResolvedValue({
    id: availabilityId,
    professional: {
      id: 'professional-id',
    },
  } as never);

  const error = new Error('Update failed');

  availabilityService.update.mockRejectedValue(error);

  await expect(
    controller.update(
      availabilityId,
      data,
      { user },
    ),
  ).rejects.toThrow(error);
});

});

describe('delete', () => {
const availabilityId = 'availability-uuid';

it('should delete availability when an admin requests it', async () => {
  const user = {
    id: 'admin-user-id',
    roles: [UserRole.ADMIN],
  };

  const availability = {
    id: availabilityId,
    professional: {
      id: 'professional-id',
    },
  };

  const deleteResult = {
    message: 'Disponibilidad eliminada',
  };

  availabilityService.getById.mockResolvedValue(
    availability as never,
  );

  availabilityService.delete.mockResolvedValue(
    deleteResult as never,
  );

  const result = await controller.delete(
    availabilityId,
    { user },
  );

  expect(availabilityService.getById).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).not.toHaveBeenCalled();

  expect(availabilityService.delete).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(result).toEqual(deleteResult);
});

it('should delete availability when the professional owns it', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  const professionalId = 'professional-id';

  availabilityService.getById.mockResolvedValue({
    id: availabilityId,
    professional: {
      id: professionalId,
    },
  } as never);

  professionalsService.getProfessionalByUserId.mockResolvedValue({
    id: professionalId,
  } as never);

  const deleteResult = {
    message: 'Disponibilidad eliminada',
  };

  availabilityService.delete.mockResolvedValue(
    deleteResult as never,
  );

  const result = await controller.delete(
    availabilityId,
    { user },
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).toHaveBeenCalledWith(user.id);

  expect(availabilityService.delete).toHaveBeenCalledWith(
    availabilityId,
  );

  expect(result).toEqual(deleteResult);
});

it('should reject a professional deleting another professional availability', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  availabilityService.getById.mockResolvedValue({
    id: availabilityId,
    professional: {
      id: 'owner-professional-id',
    },
  } as never);

  professionalsService.getProfessionalByUserId.mockResolvedValue({
    id: 'different-professional-id',
  } as never);

  await expect(
    controller.delete(
      availabilityId,
      { user },
    ),
  ).rejects.toThrow(
    new ForbiddenException(
      'No tenés permiso para modificar la disponibilidad de otro profesional',
    ),
  );

  expect(availabilityService.delete).not.toHaveBeenCalled();
});

it('should propagate errors from getById', async () => {
  const error = new Error('Availability not found');

  availabilityService.getById.mockRejectedValue(error);

  await expect(
    controller.delete(
      availabilityId,
      {
        user: {
          id: 'admin-id',
          roles: [UserRole.ADMIN],
        },
      },
    ),
  ).rejects.toThrow(error);

  expect(availabilityService.delete).not.toHaveBeenCalled();
});

it('should propagate errors from AvailabilityService.delete', async () => {
  const user = {
    id: 'admin-user-id',
    roles: [UserRole.ADMIN],
  };

  availabilityService.getById.mockResolvedValue({
    id: availabilityId,
    professional: {
      id: 'professional-id',
    },
  } as never);

  const error = new Error('Delete failed');

  availabilityService.delete.mockRejectedValue(error);

  await expect(
    controller.delete(
      availabilityId,
      { user },
    ),
  ).rejects.toThrow(error);
});

});

describe('ownership validation', () => {
it('should allow an admin without resolving the professional', async () => {
const user = {
id: 'admin-user-id',
roles: [UserRole.ADMIN],
};

  availabilityService.getById.mockResolvedValue({
    id: 'availability-id',
    professional: {
      id: 'professional-id',
    },
  } as never);

  availabilityService.update.mockResolvedValue({} as never);

  await controller.update(
    'availability-id',
    {} as any,
    { user },
  );

  expect(
    professionalsService.getProfessionalByUserId,
  ).not.toHaveBeenCalled();
});

it('should reject a professional when the resolved professional id does not match', async () => {
  const user = {
    id: 'professional-user-id',
    roles: [UserRole.PROFESSIONAL],
  };

  availabilityService.getById.mockResolvedValue({
    id: 'availability-id',
    professional: {
      id: 'target-professional-id',
    },
  } as never);

  professionalsService.getProfessionalByUserId.mockResolvedValue({
    id: 'logged-user-professional-id',
  } as never);

  await expect(
    controller.update(
      'availability-id',
      {} as any,
      { user },
    ),
  ).rejects.toThrow(ForbiddenException);

  expect(availabilityService.update).not.toHaveBeenCalled();
});

});
});