import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';
import { Service } from '../services/entities/service.entity';

describe('CategoriesRepository', () => {
let repository: CategoriesRepository;

let categoryRepository: jest.Mocked<Partial<Repository<Category>>>;
let serviceRepository: jest.Mocked<Partial<Repository<Service>>>;

beforeEach(async () => {
categoryRepository = {
findOneBy: jest.fn(),
createQueryBuilder: jest.fn(),
find: jest.fn(),
create: jest.fn(),
save: jest.fn(),
};

serviceRepository = {
  createQueryBuilder: jest.fn(),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    CategoriesRepository,
    {
      provide: getRepositoryToken(Category),
      useValue: categoryRepository,
    },
    {
      provide: getRepositoryToken(Service),
      useValue: serviceRepository,
    },
  ],
}).compile();

repository = module.get<CategoriesRepository>(
  CategoriesRepository,
);

});

afterEach(() => {
jest.clearAllMocks();
});

describe('getCategoryById', () => {
it('should return a category by id', async () => {
const id = '550e8400-e29b-41d4-a716-446655440000';

  const category = {
    id,
    name: 'Psicología',
    isActive: true,
  } as Category;

  categoryRepository.findOneBy!.mockResolvedValue(category);

  const result = await repository.getCategoryById(id);

  expect(result).toEqual(category);

  expect(
    categoryRepository.findOneBy,
  ).toHaveBeenCalledTimes(1);

  expect(
    categoryRepository.findOneBy,
  ).toHaveBeenCalledWith({ id });
});

it('should return null when the category does not exist', async () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';

  categoryRepository.findOneBy!.mockResolvedValue(null);

  const result = await repository.getCategoryById(id);

  expect(result).toBeNull();

  expect(
    categoryRepository.findOneBy,
  ).toHaveBeenCalledWith({ id });
});

it('should propagate repository errors', async () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const error = new Error('Database error');

  categoryRepository.findOneBy!.mockRejectedValue(error);

  await expect(
    repository.getCategoryById(id),
  ).rejects.toThrow(error);
});

});

describe('getCategoryByName', () => {
it('should find a category by name using a case-insensitive query', async () => {
const category = {
id: '550e8400-e29b-41d4-a716-446655440000',
name: 'Psicología',
isActive: true,
} as Category;

  const getOne = jest.fn().mockResolvedValue(category);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne,
  };

  categoryRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  const result = await repository.getCategoryByName(
    '  PSICOLOGÍA  ',
  );

  expect(result).toEqual(category);

  expect(
    categoryRepository.createQueryBuilder,
  ).toHaveBeenCalledTimes(1);

  expect(
    categoryRepository.createQueryBuilder,
  ).toHaveBeenCalledWith('category');

  expect(queryBuilder.where).toHaveBeenCalledTimes(1);

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'LOWER(category.name) = LOWER(:name)',
    {
      name: 'PSICOLOGÍA',
    },
  );

  expect(getOne).toHaveBeenCalledTimes(1);
});

it('should return null when the category does not exist', async () => {
  const getOne = jest.fn().mockResolvedValue(null);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne,
  };

  categoryRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  const result = await repository.getCategoryByName(
    'Nutrición',
  );

  expect(result).toBeNull();

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'LOWER(category.name) = LOWER(:name)',
    {
      name: 'Nutrición',
    },
  );

  expect(getOne).toHaveBeenCalledTimes(1);
});

it('should trim the name before querying', async () => {
  const getOne = jest.fn().mockResolvedValue(null);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne,
  };

  categoryRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  await repository.getCategoryByName(
    '   Psicología   ',
  );

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'LOWER(category.name) = LOWER(:name)',
    {
      name: 'Psicología',
    },
  );
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  const getOne = jest.fn().mockRejectedValue(error);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne,
  };

  categoryRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  await expect(
    repository.getCategoryByName('Psicología'),
  ).rejects.toThrow(error);
});

});

describe('getAllCategories', () => {
it('should return all categories ordered by name ascending', async () => {
const categories = [
{
id: '1',
name: 'Nutrición',
isActive: true,
},
{
id: '2',
name: 'Psicología',
isActive: true,
},
] as Category[];

  categoryRepository.find!.mockResolvedValue(categories);

  const result = await repository.getAllCategories();

  expect(result).toEqual(categories);

  expect(categoryRepository.find).toHaveBeenCalledTimes(1);

  expect(categoryRepository.find).toHaveBeenCalledWith({
    order: {
      name: 'ASC',
    },
  });
});

it('should return an empty array when there are no categories', async () => {
  categoryRepository.find!.mockResolvedValue([]);

  const result = await repository.getAllCategories();

  expect(result).toEqual([]);

  expect(categoryRepository.find).toHaveBeenCalledWith({
    order: {
      name: 'ASC',
    },
  });
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  categoryRepository.find!.mockRejectedValue(error);

  await expect(
    repository.getAllCategories(),
  ).rejects.toThrow(error);
});

});

describe('getAllActiveCategories', () => {
it('should return all active categories ordered by name ascending', async () => {
const categories = [
{
id: '1',
name: 'Nutrición',
isActive: true,
},
{
id: '2',
name: 'Psicología',
isActive: true,
},
] as Category[];

  categoryRepository.find!.mockResolvedValue(categories);

  const result =
    await repository.getAllActiveCategories();

  expect(result).toEqual(categories);

  expect(categoryRepository.find).toHaveBeenCalledTimes(1);

  expect(categoryRepository.find).toHaveBeenCalledWith({
    where: {
      isActive: true,
    },
    order: {
      name: 'ASC',
    },
  });
});

it('should return an empty array when there are no active categories', async () => {
  categoryRepository.find!.mockResolvedValue([]);

  const result =
    await repository.getAllActiveCategories();

  expect(result).toEqual([]);

  expect(categoryRepository.find).toHaveBeenCalledWith({
    where: {
      isActive: true,
    },
    order: {
      name: 'ASC',
    },
  });
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  categoryRepository.find!.mockRejectedValue(error);

  await expect(
    repository.getAllActiveCategories(),
  ).rejects.toThrow(error);
});

});

describe('createCategory', () => {
it('should create and save a category with the provided name and icon', async () => {
const category = {
id: '550e8400-e29b-41d4-a716-446655440000',
name: 'Psicología',
icon: 'brain',
isActive: true,
} as Category;

  categoryRepository.create!.mockReturnValue(category);
  categoryRepository.save!.mockResolvedValue(category);

  const result = await repository.createCategory(
    '  Psicología  ',
    '  brain  ',
  );

  expect(result).toEqual(category);

  expect(categoryRepository.create).toHaveBeenCalledTimes(1);

  expect(categoryRepository.create).toHaveBeenCalledWith({
    name: 'Psicología',
    icon: 'brain',
    isActive: true,
  });

  expect(categoryRepository.save).toHaveBeenCalledTimes(1);
  expect(categoryRepository.save).toHaveBeenCalledWith(
    category,
  );
});

it('should trim the name', async () => {
  const category = {} as Category;

  categoryRepository.create!.mockReturnValue(category);
  categoryRepository.save!.mockResolvedValue(category);

  await repository.createCategory(
    '   Psicología   ',
  );

  expect(categoryRepository.create).toHaveBeenCalledWith({
    name: 'Psicología',
    icon: null,
    isActive: true,
  });
});

it('should set icon to null when icon is not provided', async () => {
  const category = {} as Category;

  categoryRepository.create!.mockReturnValue(category);
  categoryRepository.save!.mockResolvedValue(category);

  await repository.createCategory('Psicología');

  expect(categoryRepository.create).toHaveBeenCalledWith({
    name: 'Psicología',
    icon: null,
    isActive: true,
  });
});

it('should set icon to null when icon contains only whitespace', async () => {
  const category = {} as Category;

  categoryRepository.create!.mockReturnValue(category);
  categoryRepository.save!.mockResolvedValue(category);

  await repository.createCategory(
    'Psicología',
    '     ',
  );

  expect(categoryRepository.create).toHaveBeenCalledWith({
    name: 'Psicología',
    icon: null,
    isActive: true,
  });
});

it('should propagate errors from create', async () => {
  const error = new Error('Create error');

  categoryRepository.create!.mockImplementation(() => {
    throw error;
  });

  await expect(
    repository.createCategory('Psicología'),
  ).rejects.toThrow(error);
});

it('should propagate errors from save', async () => {
  const category = {} as Category;
  const error = new Error('Save error');

  categoryRepository.create!.mockReturnValue(category);
  categoryRepository.save!.mockRejectedValue(error);

  await expect(
    repository.createCategory('Psicología'),
  ).rejects.toThrow(error);
});

});

describe('deactivateCategory', () => {
it('should set isActive to false and save the category', async () => {
const category = {
id: '550e8400-e29b-41d4-a716-446655440000',
name: 'Psicología',
isActive: true,
} as Category;

  categoryRepository.save!.mockResolvedValue(category);

  const result =
    await repository.deactivateCategory(category);

  expect(category.isActive).toBe(false);
  expect(result).toEqual(category);

  expect(categoryRepository.save).toHaveBeenCalledTimes(1);
  expect(categoryRepository.save).toHaveBeenCalledWith(
    category,
  );
});

it('should propagate repository errors', async () => {
  const category = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Psicología',
    isActive: true,
  } as Category;

  const error = new Error('Save error');

  categoryRepository.save!.mockRejectedValue(error);

  await expect(
    repository.deactivateCategory(category),
  ).rejects.toThrow(error);

  expect(category.isActive).toBe(false);
});

});

describe('reactivateCategory', () => {
it('should reactivate a category and keep the existing icon when no icon is provided', async () => {
const category = {
id: '550e8400-e29b-41d4-a716-446655440000',
name: 'Psicología',
icon: 'brain',
isActive: false,
} as Category;

  categoryRepository.save!.mockResolvedValue(category);

  const result =
    await repository.reactivateCategory(category);

  expect(category.isActive).toBe(true);
  expect(category.icon).toBe('brain');
  expect(result).toEqual(category);

  expect(categoryRepository.save).toHaveBeenCalledWith(
    category,
  );
});

it('should update the icon when a valid icon is provided', async () => {
  const category = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Psicología',
    icon: 'old-icon',
    isActive: false,
  } as Category;

  categoryRepository.save!.mockResolvedValue(category);

  const result =
    await repository.reactivateCategory(
      category,
      '  new-icon  ',
    );

  expect(category.isActive).toBe(true);
  expect(category.icon).toBe('new-icon');
  expect(result).toEqual(category);

  expect(categoryRepository.save).toHaveBeenCalledWith(
    category,
  );
});

it('should keep the existing icon when the provided icon is only whitespace', async () => {
  const category = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Psicología',
    icon: 'existing-icon',
    isActive: false,
  } as Category;

  categoryRepository.save!.mockResolvedValue(category);

  await repository.reactivateCategory(
    category,
    '     ',
  );

  expect(category.isActive).toBe(true);
  expect(category.icon).toBe('existing-icon');

  expect(categoryRepository.save).toHaveBeenCalledWith(
    category,
  );
});

it('should propagate repository errors', async () => {
  const category = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Psicología',
    icon: 'brain',
    isActive: false,
  } as Category;

  const error = new Error('Save error');

  categoryRepository.save!.mockRejectedValue(error);

  await expect(
    repository.reactivateCategory(category),
  ).rejects.toThrow(error);

  expect(category.isActive).toBe(true);
});

});

describe('isInUse', () => {
it('should return true when the category is being used by at least one service', async () => {
const getCount = jest.fn().mockResolvedValue(2);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getCount,
  };

  serviceRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  const categoryId =
    '550e8400-e29b-41d4-a716-446655440000';

  const result = await repository.isInUse(categoryId);

  expect(result).toBe(true);

  expect(
    serviceRepository.createQueryBuilder,
  ).toHaveBeenCalledTimes(1);

  expect(
    serviceRepository.createQueryBuilder,
  ).toHaveBeenCalledWith('service');

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'service.category_id = :categoryId',
    {
      categoryId,
    },
  );

  expect(getCount).toHaveBeenCalledTimes(1);
});

it('should return false when the category is not being used', async () => {
  const getCount = jest.fn().mockResolvedValue(0);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getCount,
  };

  serviceRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  const categoryId =
    '550e8400-e29b-41d4-a716-446655440000';

  const result = await repository.isInUse(categoryId);

  expect(result).toBe(false);

  expect(queryBuilder.where).toHaveBeenCalledWith(
    'service.category_id = :categoryId',
    {
      categoryId,
    },
  );

  expect(getCount).toHaveBeenCalledTimes(1);
});

it('should propagate repository errors', async () => {
  const error = new Error('Database error');

  const getCount = jest.fn().mockRejectedValue(error);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getCount,
  };

  serviceRepository.createQueryBuilder!.mockReturnValue(
    queryBuilder as any,
  );

  await expect(
    repository.isInUse(
      '550e8400-e29b-41d4-a716-446655440000',
    ),
  ).rejects.toThrow(error);
});

});
});