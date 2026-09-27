import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async getAllActive(): Promise<Category[]> {
    return this.categoriesRepository.getAllActive();
  }

  async getAll(): Promise<Category[]> {
    return this.categoriesRepository.getAll();
  }

  async getById(id: string): Promise<Category> {
    const category =
      await this.categoriesRepository.getById(id);

    if (!category) {
      throw new NotFoundException(
        'No existe la categoría seleccionada',
      );
    }

    return category;
  }
}