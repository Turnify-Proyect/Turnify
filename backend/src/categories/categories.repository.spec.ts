import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';
import { Service } from '../services/entities/service.entity';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let serviceRepository: jest.Mocked<Repository<Service>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesRepository,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOneBy: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Service),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<CategoriesRepository>(CategoriesRepository);

    categoryRepository = module.get(getRepositoryToken(Category));
    serviceRepository = module.get(getRepositoryToken(Service));
  });

  describe('getCategoryById', () => {
    it('should return a category by id', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      categoryRepository.findOneBy.mockResolvedValue(category);

      const result = await repository.getCategoryById('category-1');

      expect(result).toEqual(category);
      expect(categoryRepository.findOneBy).toHaveBeenCalledWith({
        id: 'category-1',
      });
    });

    it('should return null when category does not exist', async () => {
      categoryRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.getCategoryById('category-1');

      expect(result).toBeNull();
    });
  });

  describe('getCategoryByName', () => {
    it('should return a category by name', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      const getOne = jest.fn().mockResolvedValue(category);

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne,
      };

      categoryRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      const result = await repository.getCategoryByName('  Peluquería  ');

      expect(result).toEqual(category);
      expect(categoryRepository.createQueryBuilder).toHaveBeenCalledWith(
        'category',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'LOWER(category.name) = LOWER(:name)',
        {
          name: 'Peluquería',
        },
      );
      expect(getOne).toHaveBeenCalled();
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories ordered by name', async () => {
      const categories = [
        { id: '1', name: 'Barbería' },
        { id: '2', name: 'Peluquería' },
      ] as Category[];

      categoryRepository.find.mockResolvedValue(categories);

      const result = await repository.getAllCategories();

      expect(result).toEqual(categories);
      expect(categoryRepository.find).toHaveBeenCalledWith({
        order: {
          name: 'ASC',
        },
      });
    });
  });

  describe('getAllActiveCategories', () => {
    it('should return only active categories ordered by name', async () => {
      const categories = [
        {
          id: '1',
          name: 'Barbería',
          isActive: true,
        },
      ] as Category[];

      categoryRepository.find.mockResolvedValue(categories);

      const result = await repository.getAllActiveCategories();

      expect(result).toEqual(categories);
      expect(categoryRepository.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
        order: {
          name: 'ASC',
        },
      });
    });
  });

  describe('createCategory', () => {
    it('should create and save a category', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: 'scissors',
        isActive: true,
      } as Category;

      categoryRepository.create.mockReturnValue(category);
      categoryRepository.save.mockResolvedValue(category);

      const result = await repository.createCategory(
        '  Peluquería  ',
        '  scissors  ',
      );

      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Peluquería',
        icon: 'scissors',
        isActive: true,
      });

      expect(categoryRepository.save).toHaveBeenCalledWith(category);
      expect(result).toEqual(category);
    });

    it('should save null when icon is not provided', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: null,
        isActive: true,
      } as Category;

      categoryRepository.create.mockReturnValue(category);
      categoryRepository.save.mockResolvedValue(category);

      await repository.createCategory('Peluquería');

      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Peluquería',
        icon: null,
        isActive: true,
      });
    });
  });

  describe('deactivateCategory', () => {
    it('should deactivate and save the category', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      categoryRepository.save.mockResolvedValue(category);

      const result = await repository.deactivateCategory(category);

      expect(category.isActive).toBe(false);
      expect(categoryRepository.save).toHaveBeenCalledWith(category);
      expect(result).toEqual(category);
    });
  });

  describe('reactivateCategory', () => {
    it('should reactivate the category and update the icon when provided', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: 'old-icon',
        isActive: false,
      } as Category;

      categoryRepository.save.mockResolvedValue(category);

      const result = await repository.reactivateCategory(
        category,
        '  new-icon  ',
      );

      expect(category.isActive).toBe(true);
      expect(category.icon).toBe('new-icon');
      expect(categoryRepository.save).toHaveBeenCalledWith(category);
      expect(result).toEqual(category);
    });

    it('should reactivate the category without changing the icon when no icon is provided', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: 'old-icon',
        isActive: false,
      } as Category;

      categoryRepository.save.mockResolvedValue(category);

      await repository.reactivateCategory(category);

      expect(category.isActive).toBe(true);
      expect(category.icon).toBe('old-icon');
      expect(categoryRepository.save).toHaveBeenCalledWith(category);
    });
  });

  describe('isInUse', () => {
    it('should return true when the category is associated with services', async () => {
      const getCount = jest.fn().mockResolvedValue(2);

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount,
      };

      serviceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await repository.isInUse('category-1');

      expect(result).toBe(true);
      expect(serviceRepository.createQueryBuilder).toHaveBeenCalledWith(
        'service',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'service.category_id = :categoryId',
        {
          categoryId: 'category-1',
        },
      );
      expect(getCount).toHaveBeenCalled();
    });

    it('should return false when the category is not associated with services', async () => {
      const getCount = jest.fn().mockResolvedValue(0);

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount,
      };

      serviceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await repository.isInUse('category-1');

      expect(result).toBe(false);
    });
  });
});
