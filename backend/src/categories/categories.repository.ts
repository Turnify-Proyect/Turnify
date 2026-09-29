import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly ormCategoryRepository: Repository<Category>,
  ) {}

  async getCategoryById(id: string): Promise<Category | null> {
    return this.ormCategoryRepository.findOneBy({
      id,
    });
  }

  async getCategoryByName(name: string): Promise<Category | null> {
    return this.ormCategoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', {
        name: name.trim(),
      })
      .getOne();
  }

  async getAllCategories(): Promise<Category[]> {
    return this.ormCategoryRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async getAllActiveCategories(): Promise<Category[]> {
    return this.ormCategoryRepository.find({
      where: {
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async createCategory(name: string, icon?: string): Promise<Category> {
    const category = this.ormCategoryRepository.create({
      name: name.trim(),
      icon: icon?.trim() || null,
      isActive: true,
    });

    return this.ormCategoryRepository.save(category);
  }

  async deactivateCategory(category: Category): Promise<Category> {
    category.isActive = false;

    return this.ormCategoryRepository.save(category);
  }

  async reactivateCategory(
    category: Category,
    icon?: string,
  ): Promise<Category> {
    category.isActive = true;

    if (icon?.trim()) {
      category.icon = icon.trim();
    }

    return this.ormCategoryRepository.save(category);
  }
}
