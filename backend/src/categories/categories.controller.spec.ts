import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  const categoriesService = {
    getAllActiveCategories: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    deactivateCategory: jest.fn(),
    reactivateCategory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: categoriesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  describe('getAllActiveCategories', () => {
    it('should return all active categories', async () => {
      const categories = [
        {
          id: 'category-1',
          name: 'Peluquería',
          isActive: true,
        },
      ];

      categoriesService.getAllActiveCategories.mockResolvedValue(categories);

      const result = await controller.getAllActiveCategories();

      expect(result).toEqual(categories);
      expect(categoriesService.getAllActiveCategories).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a category by id', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      };

      categoriesService.getCategoryById.mockResolvedValue(category);

      const result = await controller.getById('category-1');

      expect(result).toEqual(category);
      expect(categoriesService.getCategoryById).toHaveBeenCalledWith(
        'category-1',
      );
    });
  });

  describe('create', () => {
    it('should create a category', async () => {
      const dto = {
        name: 'Peluquería',
        icon: 'scissors',
      };

      const category = {
        id: 'category-1',
        name: 'Peluquería',
        icon: 'scissors',
        isActive: true,
      };

      categoriesService.createCategory.mockResolvedValue(category);

      const result = await controller.create(dto);

      expect(result).toEqual(category);
      expect(categoriesService.createCategory).toHaveBeenCalledWith(dto);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a category', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: false,
      };

      categoriesService.deactivateCategory.mockResolvedValue(category);

      const result = await controller.deactivate('category-1');

      expect(result).toEqual(category);
      expect(categoriesService.deactivateCategory).toHaveBeenCalledWith(
        'category-1',
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate a category', async () => {
      const category = {
        id: 'category-1',
        name: 'Peluquería',
        isActive: true,
      };

      categoriesService.reactivateCategory.mockResolvedValue(category);

      const result = await controller.reactivate('category-1');

      expect(result).toEqual(category);
      expect(categoriesService.reactivateCategory).toHaveBeenCalledWith(
        'category-1',
      );
    });
  });
});
