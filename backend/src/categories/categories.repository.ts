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

  async getById(id: string): Promise<Category | null> {
    return this.ormCategoryRepository.findOneBy({
      id,
    });
  }

  async getAll(): Promise<Category[]> {
    return this.ormCategoryRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async getAllActive(): Promise<Category[]> {
    return this.ormCategoryRepository.find({
      where: {
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }
}