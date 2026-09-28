import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async getAllActiveCategories(): Promise<Category[]> {
    return this.categoriesRepository.getAllActiveCategories();
  }

  async getAllCategories(): Promise<Category[]> {
    return this.categoriesRepository.getAllCategories();
  }

  async getCategoryById(id: string): Promise<Category> {
    const category =
      await this.categoriesRepository.getCategoryById(id);

    if (!category) {
      throw new NotFoundException(
        'No existe la categoría seleccionada',
      );
    }

    return category;
  }

  async createCategory(
    dto: CreateCategoryDto,
  ): Promise<Category> {
    const name = dto.name.trim();

    const existing =
      await this.categoriesRepository.getCategoryByName(
        name,
      );

    if (existing?.isActive) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre',
      );
    }

    if (existing && !existing.isActive) {
      return this.categoriesRepository.reactivateCategory(
        existing,
        dto.icon,
      );
    }

    return this.categoriesRepository.createCategory(
      name,
      dto.icon,
    );
  }

  async deactivateCategory(
    id: string,
  ): Promise<Category> {
    const category = await this.getCategoryById(id);

    if (!category.isActive) {
      return category;
    }

    return this.categoriesRepository.deactivateCategory(
      category,
    );
  }

  async reactivateCategory(
    id: string,
  ): Promise<Category> {
    const category = await this.getCategoryById(id);

    if (category.isActive) {
      return category;
    }

    return this.categoriesRepository.reactivateCategory(
      category,
    );
  }

}