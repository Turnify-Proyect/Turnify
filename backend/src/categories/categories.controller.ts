import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  getAllActive() {
    return this.categoriesService.getAllActive();
  }

  @Get(':id')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.getById(id);
  }
}