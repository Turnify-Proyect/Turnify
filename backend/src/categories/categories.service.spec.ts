import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockCategoriesRepository = {
    getAllActiveCategories: jest.fn(),
    getAllCategories: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    deactivateCategory: jest.fn(),
    reactivateCategory: jest.fn(),
    isInUse: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          CategoriesService,
          {
            provide: CategoriesRepository,
            useValue: mockCategoriesRepository,
          },
        ],
      }).compile();

    service = module.get<CategoriesService>(
      CategoriesService,
    );
  });

  describe('getAllActiveCategories', () => {
    it('should return all active categories', async () => {
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

      mockCategoriesRepository.getAllActiveCategories.mockResolvedValue(
        categories,
      );

      const result =
        await service.getAllActiveCategories();

      expect(result).toEqual(categories);

      expect(
        mockCategoriesRepository.getAllActiveCategories,
      ).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when there are no active categories', async () => {
      mockCategoriesRepository.getAllActiveCategories.mockResolvedValue(
        [],
      );

      const result =
        await service.getAllActiveCategories();

      expect(result).toEqual([]);

      expect(
        mockCategoriesRepository.getAllActiveCategories,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      mockCategoriesRepository.getAllActiveCategories.mockRejectedValue(
        error,
      );

      await expect(
        service.getAllActiveCategories(),
      ).rejects.toThrow(error);
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const categories = [
        {
          id: '1',
          name: 'Nutrición',
          isActive: true,
        },
        {
          id: '2',
          name: 'Psicología',
          isActive: false,
        },
      ] as Category[];

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        categories,
      );

      const result = await service.getAllCategories();

      expect(result).toEqual(categories);

      expect(
        mockCategoriesRepository.getAllCategories,
      ).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when there are no categories', async () => {
      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [],
      );

      const result = await service.getAllCategories();

      expect(result).toEqual([]);

      expect(
        mockCategoriesRepository.getAllCategories,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      mockCategoriesRepository.getAllCategories.mockRejectedValue(
        error,
      );

      await expect(
        service.getAllCategories(),
      ).rejects.toThrow(error);
    });
  });

  describe('getCategoryById', () => {
    it('should return the category when it exists', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      const result =
        await service.getCategoryById(id);

      expect(result).toEqual(category);

      expect(
        mockCategoriesRepository.getCategoryById,
      ).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when the category does not exist', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        null,
      );

      await expect(
        service.getCategoryById(id),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getCategoryById(id),
      ).rejects.toThrow(
        'No existe la categoría seleccionada',
      );
    });

    it('should propagate repository errors', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const error = new Error('Database error');

      mockCategoriesRepository.getCategoryById.mockRejectedValue(
        error,
      );

      await expect(
        service.getCategoryById(id),
      ).rejects.toThrow(error);
    });
  });

  describe('createCategory', () => {
    it('should create a new category when no category with the same normalized name exists', async () => {
      const dto = {
        name: ' Psicología ',
        icon: ' brain ',
      };

      const category = {
        id: '1',
        name: 'Psicología',
        icon: 'brain',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [],
      );

      mockCategoriesRepository.createCategory.mockResolvedValue(
        category,
      );

      const result =
        await service.createCategory(dto);

      expect(result).toEqual(category);

      expect(
        mockCategoriesRepository.getAllCategories,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockCategoriesRepository.createCategory,
      ).toHaveBeenCalledWith(
        'Psicología',
        ' brain ',
      );

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should trim the category name before creating it', async () => {
      const dto = {
        name: '   Nutrición   ',
      };

      const category = {
        id: '1',
        name: 'Nutrición',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [],
      );

      mockCategoriesRepository.createCategory.mockResolvedValue(
        category,
      );

      await service.createCategory(dto);

      expect(
        mockCategoriesRepository.createCategory,
      ).toHaveBeenCalledWith(
        'Nutrición',
        undefined,
      );
    });

    it('should throw ConflictException when an active category with the same name already exists', async () => {
      const dto = {
        name: 'Psicología',
      };

      const existingCategory = {
        id: '1',
        name: 'Psicología',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(
        'Ya existe una categoría con ese nombre',
      );

      expect(
        mockCategoriesRepository.createCategory,
      ).not.toHaveBeenCalled();

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should detect duplicates ignoring uppercase and lowercase differences', async () => {
      const dto = {
        name: 'PSICOLOGÍA',
      };

      const existingCategory = {
        id: '1',
        name: 'Psicología',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(
        'Ya existe una categoría con ese nombre',
      );
    });

    it('should detect duplicates ignoring accents', async () => {
      const dto = {
        name: 'Psicologia',
      };

      const existingCategory = {
        id: '1',
        name: 'Psicología',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(
        'Ya existe una categoría con ese nombre',
      );
    });

    it('should detect duplicates ignoring extra spaces', async () => {
      const dto = {
        name: '  Psicología    Clínica  ',
      };

      const existingCategory = {
        id: '1',
        name: 'Psicología Clínica',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(
        'Ya existe una categoría con ese nombre',
      );
    });

    it('should reactivate an inactive category with the same normalized name', async () => {
      const dto = {
        name: '  PSICOLOGIA  ',
        icon: '  brain  ',
      };

      const existingCategory = {
        id: '1',
        name: 'Psicología',
        isActive: false,
      } as Category;

      const reactivatedCategory = {
        ...existingCategory,
        isActive: true,
        icon: 'brain',
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      mockCategoriesRepository.reactivateCategory.mockResolvedValue(
        reactivatedCategory,
      );

      const result =
        await service.createCategory(dto);

      expect(result).toEqual(reactivatedCategory);

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).toHaveBeenCalledWith(
        existingCategory,
        '  brain  ',
      );

      expect(
        mockCategoriesRepository.createCategory,
      ).not.toHaveBeenCalled();
    });

    it('should reactivate an inactive category even when the existing category has a different case or accent', async () => {
      const dto = {
        name: 'NUTRICION',
      };

      const existingCategory = {
        id: '1',
        name: 'Nutrición',
        isActive: false,
      } as Category;

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      mockCategoriesRepository.reactivateCategory.mockResolvedValue(
        existingCategory,
      );

      const result =
        await service.createCategory(dto);

      expect(result).toEqual(existingCategory);

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).toHaveBeenCalledWith(
        existingCategory,
        undefined,
      );
    });

    it('should propagate repository errors when getting categories', async () => {
      const dto = {
        name: 'Psicología',
      };

      const error = new Error('Database error');

      mockCategoriesRepository.getAllCategories.mockRejectedValue(
        error,
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(error);

      expect(
        mockCategoriesRepository.createCategory,
      ).not.toHaveBeenCalled();

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should propagate repository errors when creating a category', async () => {
      const dto = {
        name: 'Psicología',
      };

      const error = new Error('Create error');

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [],
      );

      mockCategoriesRepository.createCategory.mockRejectedValue(
        error,
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(error);
    });

    it('should propagate repository errors when reactivating a category', async () => {
      const dto = {
        name: 'Psicología',
      };

      const existingCategory = {
        id: '1',
        name: 'Psicología',
        isActive: false,
      } as Category;

      const error = new Error('Reactivate error');

      mockCategoriesRepository.getAllCategories.mockResolvedValue(
        [existingCategory],
      );

      mockCategoriesRepository.reactivateCategory.mockRejectedValue(
        error,
      );

      await expect(
        service.createCategory(dto),
      ).rejects.toThrow(error);
    });
  });

  describe('deactivateCategory', () => {
    it('should deactivate an active category when it is not in use', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      } as Category;

      const deactivatedCategory = {
        ...category,
        isActive: false,
      } as Category;

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      mockCategoriesRepository.isInUse.mockResolvedValue(
        false,
      );

      mockCategoriesRepository.deactivateCategory.mockResolvedValue(
        deactivatedCategory,
      );

      const result =
        await service.deactivateCategory(id);

      expect(result).toEqual(deactivatedCategory);

      expect(
        mockCategoriesRepository.getCategoryById,
      ).toHaveBeenCalledWith(id);

      expect(
        mockCategoriesRepository.isInUse,
      ).toHaveBeenCalledWith(id);

      expect(
        mockCategoriesRepository.deactivateCategory,
      ).toHaveBeenCalledWith(category);
    });

    it('should return the category without calling isInUse when it is already inactive', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: false,
      } as Category;

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      const result =
        await service.deactivateCategory(id);

      expect(result).toEqual(category);

      expect(
        mockCategoriesRepository.getCategoryById,
      ).toHaveBeenCalledWith(id);

      expect(
        mockCategoriesRepository.isInUse,
      ).not.toHaveBeenCalled();

      expect(
        mockCategoriesRepository.deactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the category is in use', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      mockCategoriesRepository.isInUse.mockResolvedValue(
        true,
      );

      await expect(
        service.deactivateCategory(id),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.deactivateCategory(id),
      ).rejects.toThrow(
        'No se puede desactivar la categoría porque está asociada a uno o más servicios.',
      );

      expect(
        mockCategoriesRepository.deactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should propagate the NotFoundException when the category does not exist', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        null,
      );

      await expect(
        service.deactivateCategory(id),
      ).rejects.toThrow(NotFoundException);

      expect(
        mockCategoriesRepository.isInUse,
      ).not.toHaveBeenCalled();

      expect(
        mockCategoriesRepository.deactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should propagate errors from isInUse', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      } as Category;

      const error = new Error('Database error');

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      mockCategoriesRepository.isInUse.mockRejectedValue(
        error,
      );

      await expect(
        service.deactivateCategory(id),
      ).rejects.toThrow(error);

      expect(
        mockCategoriesRepository.deactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should propagate errors when deactivating the category', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      } as Category;

      const error = new Error('Deactivate error');

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      mockCategoriesRepository.isInUse.mockResolvedValue(
        false,
      );

      mockCategoriesRepository.deactivateCategory.mockRejectedValue(
        error,
      );

      await expect(
        service.deactivateCategory(id),
      ).rejects.toThrow(error);
    });
  });

  describe('reactivateCategory', () => {
    it('should reactivate an inactive category', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: false,
      } as Category;

      const reactivatedCategory = {
        ...category,
        isActive: true,
      } as Category;

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      mockCategoriesRepository.reactivateCategory.mockResolvedValue(
        reactivatedCategory,
      );

      const result =
        await service.reactivateCategory(id);

      expect(result).toEqual(reactivatedCategory);

      expect(
        mockCategoriesRepository.getCategoryById,
      ).toHaveBeenCalledWith(id);

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).toHaveBeenCalledWith(category);
    });

    it('should return the category without calling the repository when it is already active', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      } as Category;

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      const result =
        await service.reactivateCategory(id);

      expect(result).toEqual(category);

      expect(
        mockCategoriesRepository.getCategoryById,
      ).toHaveBeenCalledWith(id);

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the category does not exist', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        null,
      );

      await expect(
        service.reactivateCategory(id),
      ).rejects.toThrow(NotFoundException);

      expect(
        mockCategoriesRepository.reactivateCategory,
      ).not.toHaveBeenCalled();
    });

    it('should propagate errors when reactivating the category', async () => {
      const id =
        '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: false,
      } as Category;

      const error = new Error('Reactivate error');

      mockCategoriesRepository.getCategoryById.mockResolvedValue(
        category,
      );

      mockCategoriesRepository.reactivateCategory.mockRejectedValue(
        error,
      );

      await expect(
        service.reactivateCategory(id),
      ).rejects.toThrow(error);
    });
  });
});
