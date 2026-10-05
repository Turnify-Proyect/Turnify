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
import { ApiErrorSwaggerResponse } from 'src/common/api/api-error-response.decorator';
import { ApiSuccessCreatedResponse } from '../common/api/api-success-created-response.decorator';
import { Professional } from 'src/professionals/entities/professional.entity';
import { Service } from './entities/service.entity';
import { ApiSuccessResponse } from '../common/api/api-success-response.decorator';
import { ApiSuccessArrayResponse } from '../common/api/api-success-array-response.decorator';
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
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Obtiene todos los servicios, incluidos los inactivos.
  //coemntado por:Lautaro-dev
  // Esta ruta está pensada para uso administrativo.
  //coemntado por:Lautaro-dev
  @Get('all')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessArrayResponse(Service)
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para acceder')
  getAll() {
    return this.servicesService.getAll();
  }

  // Obtiene únicamente los servicios activos.
  //coemntado por:Lautaro-dev
  // Es la consulta principal para clientes o vistas públicas.
  //coemntado por:Lautaro-dev
  @Get()
  @ApiSuccessArrayResponse(Service)
  getAllActive() {
    return this.servicesService.getAllActive();
  }

  // Obtiene un servicio específico por su id.
  //coemntado por:Lautaro-dev
  @Get(':id')
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiSuccessResponse(Service)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(404, 'No existe el servicio con ese ID')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getById(id);
  }

  // Actualiza parcialmente un servicio existente.
  //coemntado por:Lautaro-dev
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiSuccessResponse(Service)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para actualizar servicios')
  @ApiErrorSwaggerResponse(404, 'No existe el servicio o la categoría indicada')
  @ApiErrorSwaggerResponse(
    409,
    'El nombre del servicio ya existe o la categoría seleccionada está inactiva',
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  // Crea un nuevo servicio.
  //coemntado por:Lautaro-dev
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessCreatedResponse(Service)
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para crear servicios')
  @ApiErrorSwaggerResponse(404, 'La categoría seleccionada no existe')
  @ApiErrorSwaggerResponse(
    409,
    'Ya existe un servicio con ese nombre o la categoría seleccionada está inactiva',
  )
  create(@Body() data: CreateServiceDto) {
    return this.servicesService.create(data);
  }

  // Realiza una baja lógica del servicio.
  //coemntado por:Lautaro-dev
  // El registro se conserva en la base, pero pasa a isActive = false.
  //coemntado por:Lautaro-dev
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiSuccessResponse(Service)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para desactivar servicios')
  @ApiErrorSwaggerResponse(404, 'No existe el servicio con ese ID')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.deactivate(id);
  }

  // Reactiva un servicio previamente desactivado.
  //coemntado por:Lautaro-dev
  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiSuccessResponse(Service)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para reactivar servicios')
  @ApiErrorSwaggerResponse(404, 'No existe el servicio con ese ID')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.reactivate(id);
  }

  @Get(':serviceId/professionals')
  @ApiSuccessArrayResponse(Professional)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del servicio no tiene un formato UUID válido',
  )
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
    description: 'ID del servicio',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiSuccessResponse(Service)
  @ApiErrorSwaggerResponse(
    400,
    'El ID, archivo, tamaño o formato de imagen no son válidos',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para modificar la imagen del servicio',
  )
  @ApiErrorSwaggerResponse(404, 'No existe un servicio con el ID especificado')
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
