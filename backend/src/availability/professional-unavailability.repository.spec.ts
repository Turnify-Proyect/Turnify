import { ProfessionalUnavailabilityRepository } from './professional-unavailability.repository';
import { ProfessionalUnavailability } from './entities/professional-unavailability.entity';

describe('ProfessionalUnavailabilityRepository', () => {
let repository: ProfessionalUnavailabilityRepository;

let ormRepository: any;
let queryBuilder: any;

beforeEach(() => {
queryBuilder = {
where: jest.fn().mockReturnThis(),
andWhere: jest.fn().mockReturnThis(),
getOne: jest.fn().mockResolvedValue(null),
};

ormRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

repository = new ProfessionalUnavailabilityRepository(
  ormRepository,
);


});

afterEach(() => {
jest.clearAllMocks();
});

// ===========================================================================
// getById
// ===========================================================================

describe('getById', () => {
it('debería devolver el bloqueo solicitado', async () => {
const block = {
id: 'block-1',
startDate: '2030-10-02T12:00:00.000Z',
endDate: '2030-10-02T14:00:00.000Z',
reason: 'Vacaciones',
professional: {
id: 'professional-1',
},
};

  ormRepository.findOne.mockResolvedValue(block);

  const result = await repository.getById('block-1');

  expect(result).toBe(block);

  expect(ormRepository.findOne).toHaveBeenCalledTimes(1);

  expect(ormRepository.findOne).toHaveBeenCalledWith({
    where: {
      id: 'block-1',
    },
    relations: {
      professional: true,
    },
  });
});

it('debería devolver null si el bloqueo no existe', async () => {
  ormRepository.findOne.mockResolvedValue(null);

  const result = await repository.getById(
    'block-inexistente',
  );

  expect(result).toBeNull();

  expect(ormRepository.findOne).toHaveBeenCalledWith({
    where: {
      id: 'block-inexistente',
    },
    relations: {
      professional: true,
    },
  });
});


});

// ===========================================================================
// getByProfessionalId
// ===========================================================================

describe('getByProfessionalId', () => {
it('debería devolver los bloqueos del profesional ordenados por fecha de inicio', async () => {
const blocks = [
{
id: 'block-1',
startDate: '2030-10-02T09:00:00.000Z',
endDate: '2030-10-02T12:00:00.000Z',
},
{
id: 'block-2',
startDate: '2030-10-03T14:00:00.000Z',
endDate: '2030-10-03T16:00:00.000Z',
},
];

  ormRepository.find.mockResolvedValue(blocks);

  const result =
    await repository.getByProfessionalId(
      'professional-1',
    );

  expect(result).toBe(blocks);

  expect(ormRepository.find).toHaveBeenCalledTimes(1);

  expect(ormRepository.find).toHaveBeenCalledWith({
    where: {
      professional: {
        id: 'professional-1',
      },
    },
    order: {
      startDate: 'ASC',
    },
  });
});

it('debería devolver un array vacío si el profesional no tiene bloqueos', async () => {
  ormRepository.find.mockResolvedValue([]);

  const result =
    await repository.getByProfessionalId(
      'professional-1',
    );

  expect(result).toEqual([]);

  expect(ormRepository.find).toHaveBeenCalledWith({
    where: {
      professional: {
        id: 'professional-1',
      },
    },
    order: {
      startDate: 'ASC',
    },
  });
});


});

// ===========================================================================
// getOverlapping
// ===========================================================================

describe('getOverlapping', () => {
it('debería devolver un bloqueo que se superpone', async () => {
const block = {
id: 'block-1',
professional: {
id: 'professional-1',
},
startDate: '2030-10-02T12:00:00.000Z',
endDate: '2030-10-02T14:00:00.000Z',
};

  queryBuilder.getOne.mockResolvedValue(block);

  const result = await repository.getOverlapping(
    'professional-1',
    '2030-10-02T13:00:00.000Z',
    '2030-10-02T15:00:00.000Z',
  );

  expect(result).toBe(block);

  expect(
    ormRepository.createQueryBuilder,
  ).toHaveBeenCalledWith('unavailability');

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'unavailability.professional_id = :professionalId',
    {
      professionalId: 'professional-1',
    },
  );

  expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
    1,
    'unavailability.start_date <= :endDate',
    {
      endDate: '2030-10-02T15:00:00.000Z',
    },
  );

  expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
    2,
    'unavailability.end_date >= :startDate',
    {
      startDate: '2030-10-02T13:00:00.000Z',
    },
  );

  expect(queryBuilder.getOne).toHaveBeenCalledTimes(1);
});

it('debería devolver null si no existe un bloqueo superpuesto', async () => {
  queryBuilder.getOne.mockResolvedValue(null);

  const result = await repository.getOverlapping(
    'professional-1',
    '2030-10-02T13:00:00.000Z',
    '2030-10-02T15:00:00.000Z',
  );

  expect(result).toBeNull();

  expect(
    ormRepository.createQueryBuilder,
  ).toHaveBeenCalledWith('unavailability');

  expect(queryBuilder.getOne).toHaveBeenCalledTimes(1);
});

it('debería consultar usando correctamente el profesional y las fechas', async () => {
  await repository.getOverlapping(
    'professional-123',
    '2030-10-05T10:00:00.000Z',
    '2030-10-05T11:00:00.000Z',
  );

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'unavailability.professional_id = :professionalId',
    {
      professionalId: 'professional-123',
    },
  );

  expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
    1,
    'unavailability.start_date <= :endDate',
    {
      endDate: '2030-10-05T11:00:00.000Z',
    },
  );

  expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
    2,
    'unavailability.end_date >= :startDate',
    {
      startDate: '2030-10-05T10:00:00.000Z',
    },
  );
});


});

// ===========================================================================
// create
// ===========================================================================

describe('create', () => {
it('debería crear y guardar un bloqueo', async () => {
const data = {
startDate: '2030-10-02T12:00:00.000Z',
endDate: '2030-10-02T14:00:00.000Z',
reason: ' Vacaciones ',
} as any;

  const createdBlock = {
    id: 'block-1',
    startDate: data.startDate,
    endDate: data.endDate,
    reason: 'Vacaciones',
    professional: {
      id: 'professional-1',
    },
  };

  ormRepository.create.mockReturnValue(
    createdBlock,
  );

  ormRepository.save.mockResolvedValue(
    createdBlock,
  );

  const result = await repository.create(
    'professional-1',
    data,
  );

  expect(ormRepository.create).toHaveBeenCalledTimes(1);

  expect(ormRepository.create).toHaveBeenCalledWith({
    startDate: data.startDate,
    endDate: data.endDate,
    reason: 'Vacaciones',
    professional: {
      id: 'professional-1',
    },
  });

  expect(ormRepository.save).toHaveBeenCalledTimes(1);

  expect(ormRepository.save).toHaveBeenCalledWith(
    createdBlock,
  );

  expect(result).toBe(createdBlock);
});

it('debería convertir un reason vacío en null', async () => {
  const data = {
    startDate: '2030-10-02T12:00:00.000Z',
    endDate: '2030-10-02T14:00:00.000Z',
    reason: '   ',
  } as any;

  const createdBlock = {
    id: 'block-1',
  };

  ormRepository.create.mockReturnValue(
    createdBlock,
  );

  ormRepository.save.mockResolvedValue(
    createdBlock,
  );

  await repository.create(
    'professional-1',
    data,
  );

  expect(ormRepository.create).toHaveBeenCalledWith({
    startDate: data.startDate,
    endDate: data.endDate,
    reason: null,
    professional: {
      id: 'professional-1',
    },
  });
});

it('debería usar null cuando reason no está definido', async () => {
  const data = {
    startDate: '2030-10-02T12:00:00.000Z',
    endDate: '2030-10-02T14:00:00.000Z',
  } as any;

  const createdBlock = {
    id: 'block-1',
  };

  ormRepository.create.mockReturnValue(
    createdBlock,
  );

  ormRepository.save.mockResolvedValue(
    createdBlock,
  );

  await repository.create(
    'professional-1',
    data,
  );

  expect(ormRepository.create).toHaveBeenCalledWith({
    startDate: data.startDate,
    endDate: data.endDate,
    reason: null,
    professional: {
      id: 'professional-1',
    },
  });
});

it('debería conservar el reason correctamente cuando no tiene espacios externos', async () => {
  const data = {
    startDate: '2030-10-02T12:00:00.000Z',
    endDate: '2030-10-02T14:00:00.000Z',
    reason: 'Turno médico',
  } as any;

  const createdBlock = {
    id: 'block-1',
  };

  ormRepository.create.mockReturnValue(
    createdBlock,
  );

  ormRepository.save.mockResolvedValue(
    createdBlock,
  );

  await repository.create(
    'professional-1',
    data,
  );

  expect(ormRepository.create).toHaveBeenCalledWith({
    startDate: data.startDate,
    endDate: data.endDate,
    reason: 'Turno médico',
    professional: {
      id: 'professional-1',
    },
  });
});


});

// ===========================================================================
// delete
// ===========================================================================

describe('delete', () => {
it('debería eliminar el bloqueo por id', async () => {
ormRepository.delete.mockResolvedValue({
affected: 1,
});

  await repository.delete('block-1');

  expect(ormRepository.delete).toHaveBeenCalledTimes(1);

  expect(ormRepository.delete).toHaveBeenCalledWith(
    'block-1',
  );
});

it('debería completar correctamente aunque no exista el bloqueo', async () => {
  ormRepository.delete.mockResolvedValue({
    affected: 0,
  });

  await expect(
    repository.delete('block-inexistente'),
  ).resolves.toBeUndefined();

  expect(ormRepository.delete).toHaveBeenCalledWith(
    'block-inexistente',
  );
});


});

// ===========================================================================
// Errores de TypeORM
// ===========================================================================

describe('manejo de errores', () => {
it('debería propagar el error de getById', async () => {
const error = new Error('Database error');

  ormRepository.findOne.mockRejectedValue(error);

  await expect(
    repository.getById('block-1'),
  ).rejects.toThrow(error);
});

it('debería propagar el error de getByProfessionalId', async () => {
  const error = new Error('Database error');

  ormRepository.find.mockRejectedValue(error);

  await expect(
    repository.getByProfessionalId(
      'professional-1',
    ),
  ).rejects.toThrow(error);
});

it('debería propagar el error de getOverlapping', async () => {
  const error = new Error('Database error');

  queryBuilder.getOne.mockRejectedValue(error);

  await expect(
    repository.getOverlapping(
      'professional-1',
      '2030-10-02T12:00:00.000Z',
      '2030-10-02T14:00:00.000Z',
    ),
  ).rejects.toThrow(error);
});

it('debería propagar el error de save', async () => {
  const error = new Error('Database error');

  const data = {
    startDate: '2030-10-02T12:00:00.000Z',
    endDate: '2030-10-02T14:00:00.000Z',
  } as any;

  ormRepository.create.mockReturnValue({
    id: 'block-1',
  });

  ormRepository.save.mockRejectedValue(error);

  await expect(
    repository.create(
      'professional-1',
      data,
    ),
  ).rejects.toThrow(error);
});

it('debería propagar el error de delete', async () => {
  const error = new Error('Database error');

  ormRepository.delete.mockRejectedValue(error);

  await expect(
    repository.delete('block-1'),
  ).rejects.toThrow(error);
});


});
});