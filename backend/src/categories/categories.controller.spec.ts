import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  const mockCategoriesService = {
    getAllActiveCategories: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    deactivateCategory: jest.fn(),
    reactivateCategory: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller =
      module.get<CategoriesController>(CategoriesController);
  });

  describe('getAllActiveCategories', () => {
    it('should return all active categories', async () => {
      const categories = [
        {
          id: '1',
          name: 'Psicología',
          isActive: true,
        },
        {
          id: '2',
          name: 'Nutrición',
          isActive: true,
        },
      ];

      mockCategoriesService.getAllActiveCategories.mockResolvedValue(
        categories,
      );

      const result =
        await controller.getAllActiveCategories();

      expect(result).toEqual(categories);

      expect(
        mockCategoriesService.getAllActiveCategories,
      ).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when there are no active categories', async () => {
      mockCategoriesService.getAllActiveCategories.mockResolvedValue([]);

      const result =
        await controller.getAllActiveCategories();

      expect(result).toEqual([]);

      expect(
        mockCategoriesService.getAllActiveCategories,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from CategoriesService', async () => {
      const error = new Error('Service error');

      mockCategoriesService.getAllActiveCategories.mockRejectedValue(
        error,
      );

      await expect(
        controller.getAllActiveCategories(),
      ).rejects.toThrow(error);
    });
  });

  describe('getById', () => {
    it('should return a category by id', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      };

      mockCategoriesService.getCategoryById.mockResolvedValue(
        category,
      );

      const result = await controller.getById(id);

      expect(result).toEqual(category);

      expect(
        mockCategoriesService.getCategoryById,
      ).toHaveBeenCalledWith(id);
    });

    it('should propagate errors from CategoriesService', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const error = new Error('Category not found');

      mockCategoriesService.getCategoryById.mockRejectedValue(
        error,
      );

      await expect(
        controller.getById(id),
      ).rejects.toThrow(error);
    });

    it('should pass the exact id received from the route', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      mockCategoriesService.getCategoryById.mockResolvedValue({});

      await controller.getById(id);

      expect(
        mockCategoriesService.getCategoryById,
      ).toHaveBeenCalledWith(id);
    });
  });

  describe('create', () => {
    it('should create a category with the provided DTO', async () => {
      const dto = {
        name: 'Psicología',
      };

      const category = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Psicología',
        isActive: true,
      };

      mockCategoriesService.createCategory.mockResolvedValue(
        category,
      );

      const result = await controller.create(dto);

      expect(result).toEqual(category);

      expect(
        mockCategoriesService.createCategory,
      ).toHaveBeenCalledWith(dto);
    });

    it('should pass the same DTO object to the service', async () => {
      const dto = {
        name: 'Psicología',
      };

      mockCategoriesService.createCategory.mockResolvedValue({});

      await controller.create(dto);

      expect(
        mockCategoriesService.createCategory,
      ).toHaveBeenCalledWith(dto);

      expect(
        mockCategoriesService.createCategory.mock.calls[0][0],
      ).toBe(dto);
    });

    it('should propagate errors from CategoriesService', async () => {
      const dto = {
        name: 'Psicología',
      };

      const error = new Error('Service error');

      mockCategoriesService.createCategory.mockRejectedValue(
        error,
      );

      await expect(
        controller.create(dto),
      ).rejects.toThrow(error);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a category by id', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: false,
      };

      mockCategoriesService.deactivateCategory.mockResolvedValue(
        category,
      );

      const result = await controller.deactivate(id);

      expect(result).toEqual(category);

      expect(
        mockCategoriesService.deactivateCategory,
      ).toHaveBeenCalledWith(id);
    });

    it('should propagate errors from CategoriesService', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const error = new Error('Service error');

      mockCategoriesService.deactivateCategory.mockRejectedValue(
        error,
      );

      await expect(
        controller.deactivate(id),
      ).rejects.toThrow(error);
    });

    it('should pass the exact id received from the route', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      mockCategoriesService.deactivateCategory.mockResolvedValue(
        {},
      );

      await controller.deactivate(id);

      expect(
        mockCategoriesService.deactivateCategory,
      ).toHaveBeenCalledWith(id);
    });
  });

  describe('reactivate', () => {
    it('should reactivate a category by id', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      const category = {
        id,
        name: 'Psicología',
        isActive: true,
      };

      mockCategoriesService.reactivateCategory.mockResolvedValue(
        category,
      );

      const result = await controller.reactivate(id);

      expect(result).toEqual(category);

      expect(
        mockCategoriesService.reactivateCategory,
      ).toHaveBeenCalledWith(id);
    });

    it('should propagate errors from CategoriesService', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const error = new Error('Service error');

      mockCategoriesService.reactivateCategory.mockRejectedValue(
        error,
      );

      await expect(
        controller.reactivate(id),
      ).rejects.toThrow(error);
    });

    it('should pass the exact id received from the route', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      mockCategoriesService.reactivateCategory.mockResolvedValue(
        {},
      );

      await controller.reactivate(id);

      expect(
        mockCategoriesService.reactivateCategory,
      ).toHaveBeenCalledWith(id);
    });
  });
});
