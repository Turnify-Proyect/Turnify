import { ProfessionalUnavailabilityController } from './professional-unavailability.controller';
import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { UserRole } from '../common/userRoles.enum';

describe('ProfessionalUnavailabilityController', () => {
let controller: ProfessionalUnavailabilityController;
let service: {
getByProfessionalId: jest.Mock;
create: jest.Mock;
delete: jest.Mock;
};

beforeEach(() => {
service = {
getByProfessionalId: jest.fn(),
create: jest.fn(),
delete: jest.fn(),
};

controller = new ProfessionalUnavailabilityController(
  service as unknown as ProfessionalUnavailabilityService,
);


});

afterEach(() => {
jest.clearAllMocks();
});

// ===========================================================================
// getByProfessionalId
// ===========================================================================

describe('getByProfessionalId', () => {
it('debería devolver los bloqueos del profesional', async () => {
const professionalId = 'professional-uuid';

  const blocks = [
    {
      id: 'block-1',
      professionalId,
      startAt: new Date('2030-10-02T12:00:00.000Z'),
      endAt: new Date('2030-10-02T14:00:00.000Z'),
    },
    {
      id: 'block-2',
      professionalId,
      startAt: new Date('2030-10-03T15:00:00.000Z'),
      endAt: new Date('2030-10-03T17:00:00.000Z'),
    },
  ];

  service.getByProfessionalId.mockResolvedValue(blocks);

  const result =
    await controller.getByProfessionalId(professionalId);

  expect(result).toBe(blocks);

  expect(
    service.getByProfessionalId,
  ).toHaveBeenCalledTimes(1);

  expect(
    service.getByProfessionalId,
  ).toHaveBeenCalledWith(professionalId);
});

it('debería devolver un array vacío si el profesional no tiene bloqueos', async () => {
  const professionalId = 'professional-uuid';

  service.getByProfessionalId.mockResolvedValue([]);

  const result =
    await controller.getByProfessionalId(professionalId);

  expect(result).toEqual([]);

  expect(
    service.getByProfessionalId,
  ).toHaveBeenCalledWith(professionalId);
});

it('debería propagar el error del service', async () => {
  const professionalId = 'professional-uuid';
  const error = new Error('Error obteniendo bloqueos');

  service.getByProfessionalId.mockRejectedValue(error);

  await expect(
    controller.getByProfessionalId(professionalId),
  ).rejects.toThrow(error);

  expect(
    service.getByProfessionalId,
  ).toHaveBeenCalledWith(professionalId);
});


});

// ===========================================================================
// create
// ===========================================================================

describe('create', () => {
it('debería crear un bloqueo para el profesional', async () => {
const professionalId = 'professional-uuid';

  const data = {
    startAt: '2030-10-02T12:00:00.000Z',
    endAt: '2030-10-02T14:00:00.000Z',
  } as any;

  const createdBlock = {
    id: 'block-1',
    professionalId,
    ...data,
  };

  service.create.mockResolvedValue(createdBlock);

  const result = await controller.create(
    professionalId,
    data,
  );

  expect(result).toBe(createdBlock);

  expect(service.create).toHaveBeenCalledTimes(1);

  expect(service.create).toHaveBeenCalledWith(
    professionalId,
    data,
  );
});

it('debería pasar el DTO completo al service', async () => {
  const professionalId = 'professional-uuid';

  const data = {
    startAt: '2030-10-02T12:00:00.000Z',
    endAt: '2030-10-02T14:00:00.000Z',
    reason: 'Vacaciones',
  } as any;

  service.create.mockResolvedValue({
    id: 'block-1',
    professionalId,
    ...data,
  });

  await controller.create(
    professionalId,
    data,
  );

  expect(service.create).toHaveBeenCalledWith(
    professionalId,
    data,
  );
});

it('debería propagar el error del service', async () => {
  const professionalId = 'professional-uuid';

  const data = {
    startAt: '2030-10-02T12:00:00.000Z',
    endAt: '2030-10-02T14:00:00.000Z',
  } as any;

  const error = new Error(
    'El profesional ya tiene un bloqueo en ese horario',
  );

  service.create.mockRejectedValue(error);

  await expect(
    controller.create(
      professionalId,
      data,
    ),
  ).rejects.toThrow(error);

  expect(service.create).toHaveBeenCalledWith(
    professionalId,
    data,
  );
});


});

// ===========================================================================
// delete
// ===========================================================================

describe('delete', () => {
it('debería eliminar el bloqueo indicado', async () => {
const id = 'block-uuid';

  const response = {
    message: 'Bloqueo eliminado correctamente',
  };

  service.delete.mockResolvedValue(response);

  const result = await controller.delete(id);

  expect(result).toBe(response);

  expect(service.delete).toHaveBeenCalledTimes(1);

  expect(service.delete).toHaveBeenCalledWith(id);
});

it('debería propagar el error del service', async () => {
  const id = 'block-uuid';
  const error = new Error(
    'No existe el bloqueo solicitado',
  );

  service.delete.mockRejectedValue(error);

  await expect(
    controller.delete(id),
  ).rejects.toThrow(error);

  expect(service.delete).toHaveBeenCalledWith(id);
});


});

// ===========================================================================
// Guards y roles
// ===========================================================================

describe('configuración de seguridad', () => {
it('debería tener configurados los guards en los endpoints', () => {
const getByProfessionalIdDescriptor = Object.getOwnPropertyDescriptor(
ProfessionalUnavailabilityController.prototype,
'getByProfessionalId',
);

  const createDescriptor = Object.getOwnPropertyDescriptor(
    ProfessionalUnavailabilityController.prototype,
    'create',
  );

  const deleteDescriptor = Object.getOwnPropertyDescriptor(
    ProfessionalUnavailabilityController.prototype,
    'delete',
  );

  expect(getByProfessionalIdDescriptor).toBeDefined();
  expect(createDescriptor).toBeDefined();
  expect(deleteDescriptor).toBeDefined();
});


});
});