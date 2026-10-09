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
import { CategoriesService } from './categories.service';
import { UserRole } from 'src/common/userRoles.enum';
import { Roles } from 'src/decorators/roles.decorators';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener la lista de categorías activas',
    description:
      'Devuelve un listado público de todas las categorías que se encuentran activas en el sistema, ordenadas alfabéticamente por nombre. No requiere autenticación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías activas devuelta con éxito.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor al consultar la base de datos.',
  })
  getAllActiveCategories() {
    return this.categoriesService.getAllActiveCategories();
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID de la categoría en formato UUID',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Obtener el detalle de una categoría específica por su ID',
    description:
      'Devuelve toda la información de una categoría registrada en el sistema utilizando su identificador único. No requiere autenticación.',
  })
  @ApiResponse({ status: 200, description: 'Categoría encontrada con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID requerido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ninguna categoría registrada en el sistema con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor al consultar la base de datos.',
  })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear una nueva categoría',
    description:
      'Permite a un administrador registrar una nueva categoría. El sistema normaliza el nombre y verifica que no exista una duplicada.',
  })
  @ApiResponse({ status: 201, description: 'Categoría creada con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Los datos provistos en el CreateCategoryDto no cumplen con las reglas de validación.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: Ya existe una categoría registrada con un nombre idéntico o similar.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la solicitud o guardar en la base de datos.',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID de la categoría a desactivar en formato UUID',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Desactivar una categoría (Soft Delete)',
    description:
      'Cambia el estado de la categoría a inactivo (isActive: false). Solo se permite si no tiene servicios asociados y el usuario es Administrador.',
  })
  @ApiResponse({ status: 200, description: 'Categoría desactivada con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ninguna categoría registrada con el ID proporcionado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: No se puede desactivar la categoría porque se encuentra asociada a uno o más servicios activos.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización o guardar en la base de datos.',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.deactivateCategory(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID de la categoría a reactivar en formato UUID',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @ApiOperation({
    summary: 'Reactivar una categoría inactiva',
    description:
      'Cambia el estado de la categoría a activo (isActive: true). Operación exclusiva para Administradores.',
  })
  @ApiResponse({ status: 200, description: 'Categoría reactivada con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMINISTRADOR.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ninguna categoría registrada en el sistema con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización o guardar en la base de datos.',
  })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.reactivateCategory(id);
  }
}
