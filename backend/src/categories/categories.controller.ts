import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiSuccessCreatedResponse } from 'src/common/api';
import { Category } from './category.entity';
import { ApiSuccessArrayResponse } from '../common/api/api-success-array-response.decorator';
import { ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { UserRole } from 'src/common/userRoles.enum';
import { Roles } from 'src/decorators/roles.decorators';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ApiErrorSwaggerResponse } from 'src/common/api/api-error-response.decorator';
import { ApiSuccessResponse } from 'src/common/api';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiSuccessArrayResponse(Category)
  getAllActiveCategories() {
    return this.categoriesService.getAllActiveCategories();
  }

  @Get(':id')
  @ApiSuccessResponse(Category)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(404, 'Categoría no encontrada')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  // Solo administrador
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiSuccessCreatedResponse(Category)
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para crear categorías')
  @ApiErrorSwaggerResponse(409, 'La categoría ya existe')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  // Soft delete
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiSuccessResponse(Category)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para desactivar categorías')
  @ApiErrorSwaggerResponse(404, 'Categoría no encontrada')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.deactivateCategory(id);
  }

  // Reactivación manual
  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiSuccessResponse(Category)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para reactivar categorías')
  @ApiErrorSwaggerResponse(404, 'Categoría no encontrada')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.reactivateCategory(id);
  }
}
