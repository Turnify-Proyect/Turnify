import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: {
    getAllActiveCategories: jest.Mock;
    getAllCategories: jest.Mock;
    getCategoryById: jest.Mock;
    createCategory: jest.Mock;
    deactivateCategory: jest.Mock;
    reactivateCategory: jest.Mock;
    isInUse: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      getAllActiveCategories: jest.fn(),
      getAllCategories: jest.fn(),
      getCategoryById: jest.fn(),
      createCategory: jest.fn(),
      deactivateCategory: jest.fn(),
      reactivateCategory: jest.fn(),
      isInUse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('getAllActiveCategories', () => {
    it('should return all active categories', async () => {
      const categories = [
        {
          id: 'category-1',
          name: 'Peluquería',
          isActive: true,
        },
      ] as Category[];

      repository.getAllActiveCategories.mockResolvedValue(categories);

      const result = await service.getAllActiveCategories();

      expect(result).toEqual(categories);
      expect(repository.getAllActiveCategories).toHaveBeenCalled();
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const categories = [
        {
          id: 'category-1',
          name: 'Peluquería',
          isActive: true,
        },
        {
          id: 'category-2',
          name: 'Masajes',
          isActive: false,
        },
      ] as Category[];

      repository.getAllCategories.mockResolvedValue(categories);

      const result = await service.getAllCategories();

      expect(result).toEqual(categories);
    });
  });

  describe('getCategoryById', () => {
    it('should return the category when it exists', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      repository.getCategoryById.mockResolvedValue(category);

      const result = await service.getCategoryById('category-1');

      expect(result).toEqual(category);
      expect(repository.getCategoryById).toHaveBeenCalledWith('category-1');
    });

    it('should throw NotFoundException when the category does not exist', async () => {
      repository.getCategoryById.mockResolvedValue(null);

      await expect(service.getCategoryById('category-1')).rejects.toThrow(
        new NotFoundException('No existe la categoría seleccionada'),
      );
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: 'scissors',
        isActive: true,
      } as Category;

      repository.getAllCategories.mockResolvedValue([]);
      repository.createCategory.mockResolvedValue(category);

      const result = await service.createCategory({
        name: '  Peluquería  ',
        icon: 'scissors',
      });

      expect(repository.getAllCategories).toHaveBeenCalled();
      expect(repository.createCategory).toHaveBeenCalledWith(
        'Peluquería',
        'scissors',
      );
      expect(result).toEqual(category);
    });

    it('should throw ConflictException when an active category with the same normalized name exists', async () => {
      repository.getAllCategories.mockResolvedValue([
        {
          id: 'category-1',
          name: 'Peluquería',
          isActive: true,
        } as Category,
      ]);

      await expect(
        service.createCategory({
          name: '  PELUQUERIA  ',
        }),
      ).rejects.toThrow(
        new ConflictException('Ya existe una categoría con ese nombre'),
      );

      expect(repository.createCategory).not.toHaveBeenCalled();
      expect(repository.reactivateCategory).not.toHaveBeenCalled();
    });

    it('should reactivate an inactive category with the same normalized name', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: 'old-icon',
        isActive: false,
      } as Category;

      const reactivatedCategory = {
        ...category,
        isActive: true,
        icon: 'new-icon',
      } as Category;

      repository.getAllCategories.mockResolvedValue([category]);
      repository.reactivateCategory.mockResolvedValue(reactivatedCategory);

      const result = await service.createCategory({
        name: ' PELUQUERIA ',
        icon: ' new-icon ',
      });

      expect(repository.reactivateCategory).toHaveBeenCalledWith(
        category,
        ' new-icon ',
      );

      expect(result).toEqual(reactivatedCategory);
      expect(repository.createCategory).not.toHaveBeenCalled();
    });

    it('should consider accents and extra spaces when comparing category names', async () => {
      repository.getAllCategories.mockResolvedValue([
        {
          id: 'category-1',
          name: '  Peluquería   ',
          isActive: true,
        } as Category,
      ]);

      await expect(
        service.createCategory({
          name: 'PELUQUERIA',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivateCategory', () => {
    it('should throw NotFoundException when the category does not exist', async () => {
      repository.getCategoryById.mockResolvedValue(null);

      await expect(service.deactivateCategory('category-1')).rejects.toThrow(
        new NotFoundException('No existe la categoría seleccionada'),
      );

      expect(repository.isInUse).not.toHaveBeenCalled();
    });

    it('should return the category when it is already inactive', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: false,
      } as Category;

      repository.getCategoryById.mockResolvedValue(category);

      const result = await service.deactivateCategory('category-1');

      expect(result).toEqual(category);
      expect(repository.isInUse).not.toHaveBeenCalled();
      expect(repository.deactivateCategory).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the category is in use', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      repository.getCategoryById.mockResolvedValue(category);
      repository.isInUse.mockResolvedValue(true);

      await expect(service.deactivateCategory('category-1')).rejects.toThrow(
        new ConflictException(
          'No se puede desactivar la categoría porque está asociada a uno o más servicios.',
        ),
      );

      expect(repository.deactivateCategory).not.toHaveBeenCalled();
    });

    it('should deactivate the category when it is not in use', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      repository.getCategoryById.mockResolvedValue(category);
      repository.isInUse.mockResolvedValue(false);
      repository.deactivateCategory.mockResolvedValue({
        ...category,
        isActive: false,
      });

      const result = await service.deactivateCategory('category-1');

      expect(repository.isInUse).toHaveBeenCalledWith('category-1');
      expect(repository.deactivateCategory).toHaveBeenCalledWith(category);
      expect(result.isActive).toBe(false);
    });
  });

  describe('reactivateCategory', () => {
    it('should throw NotFoundException when the category does not exist', async () => {
      repository.getCategoryById.mockResolvedValue(null);

      await expect(service.reactivateCategory('category-1')).rejects.toThrow(
        new NotFoundException('No existe la categoría seleccionada'),
      );
    });

    it('should return the category when it is already active', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      } as Category;

      repository.getCategoryById.mockResolvedValue(category);

      const result = await service.reactivateCategory('category-1');

      expect(result).toEqual(category);
      expect(repository.reactivateCategory).not.toHaveBeenCalled();
    });

    it('should reactivate an inactive category', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: false,
      } as Category;

      const reactivatedCategory = {
        ...category,
        isActive: true,
      } as Category;

      repository.getCategoryById.mockResolvedValue(category);
      repository.reactivateCategory.mockResolvedValue(reactivatedCategory);

      const result = await service.reactivateCategory('category-1');

      expect(repository.reactivateCategory).toHaveBeenCalledWith(category);
      expect(result).toEqual(reactivatedCategory);
    });
  });
});
