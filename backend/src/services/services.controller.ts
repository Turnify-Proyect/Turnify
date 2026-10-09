import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import {
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('all')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener absolutamente todos los servicios (Solo Administradores)',
    description:
      'Devuelve una lista completa de todos los servicios registrados en el sistema, tanto activos como inactivos, incluyendo la información de su categoría relacionada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de servicios activos e inactivos devuelta con éxito.',
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
    status: 500,
    description: 'Error interno del servidor al consultar la base de datos.',
  })
  getAll() {
    return this.servicesService.getAll();
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener la lista de servicios activos',
    description:
      'Devuelve un listado público con todos los servicios que se encuentran activos en el sistema, incluyendo sus categorías asociadas. No requiere autenticación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de servicios activos devuelta con éxito.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor al consultar la base de datos.',
  })
  getAllActive() {
    return this.servicesService.getAllActive();
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener el detalle de un servicio específico por su ID',
    description:
      'Devuelve toda la información de un servicio incluyendo su categoría asociada. No requiere autenticación.',
  })
  @ApiResponse({ status: 200, description: 'Servicio encontrado con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún servicio con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor al consultar la base de datos.',
  })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar parcialmente un servicio existente',
    description:
      'Permite a un administrador modificar los datos de un servicio. Valida la disponibilidad del nombre y la existencia de la categoría si se proveen.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Servicio actualizado con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID no es un UUID válido o los datos enviados en el UpdateServiceDto no cumplen las reglas de validación.',
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
      'No encontrado: No existe el servicio con el ID provisto, o la categoría especificada no existe.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El nombre que intentas asignar ya está siendo utilizado por otro servicio.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización o guardar en la base de datos.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un nuevo servicio',
    description:
      'Permite a un administrador registrar un nuevo servicio en el sistema vinculándolo a una categoría existente.',
  })
  @ApiResponse({ status: 201, description: 'Servicio creado con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: Los datos provistos en el CreateServiceDto no cumplen con las reglas de validación.',
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
      'No encontrado: La categoría especificada por categoryId no existe en la base de datos.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: Ya existe un servicio registrado con ese mismo nombre.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la solicitud o guardar en la base de datos.',
  })
  create(@Body() data: CreateServiceDto) {
    return this.servicesService.create(data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio a desactivar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Desactivar un servicio (Soft Delete)',
    description:
      'Cambia el estado del servicio a inactivo (isActive: false). Operación exclusiva para Administradores.',
  })
  @ApiResponse({ status: 200, description: 'Servicio desactivado con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido.',
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
      'No encontrado: No existe ningún servicio con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio a reactivar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Reactivar un servicio inactivo',
    description:
      'Cambia el estado del servicio a activo (isActive: true). Operación exclusiva para Administradores.',
  })
  @ApiResponse({ status: 200, description: 'Servicio reactivado con éxito.' })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID enviado no tiene un formato UUID válido.',
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
      'No encontrado: No existe ningún servicio con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al procesar la actualización en la base de datos.',
  })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.reactivate(id);
  }

  @Get(':serviceId/professionals')
  @ApiParam({
    name: 'serviceId',
    required: true,
    type: String,
    description:
      'ID del servicio en formato UUID para obtener sus profesionales asociados',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener profesionales asociados a un servicio',
    description:
      'Devuelve una lista pública de todos los profesionales capacitados para realizar el servicio especificado por ID, incluyendo sus datos de usuario relacionales. No requiere autenticación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de profesionales obtenida exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El serviceId enviado no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún servicio registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al realizar las consultas u obtener las relaciones en la base de datos.',
  })
  async getProfessionalsByService(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.servicesService.getProfessionalsByService(serviceId);
  }

  @Patch(':id/upload-image')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Subir o actualizar la imagen representativa de un servicio a Cloudinary',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPEG, PNG, WEBP) de máximo 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Imagen del servicio actualizada correctamente en Cloudinary y guardada en la base de datos.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID no es un UUID válido, el archivo excede los 5MB o no cumple con el formato permitido (jpg, jpeg, png, webp).',
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
      'No encontrado: No existe un servicio con el ID especificado en la base de datos.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno: Falla de comunicación con el servicio de Cloudinary o al guardar el registro en la base de datos.',
  })
  uploadServiceImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.servicesService.updateServiceImage(id, file);
  }
}
