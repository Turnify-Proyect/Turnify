import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { Service } from '../services/entities/service.entity';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly ormCategoryRepository: Repository<Category>,
    @InjectRepository(Service)
    private readonly ormServiceRepository: Repository<Service>,
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

  async isInUse(categoryId: string): Promise<boolean> {
  const count = await this.ormServiceRepository
    .createQueryBuilder('service')
    .where('service.category_id = :categoryId', {
      categoryId,
    })
    .getCount();

  return count > 0;
}
}
