import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Service } from '../services/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category,Service])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
