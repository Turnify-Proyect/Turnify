import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

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
  @ApiResponse({
    status: 200,
    description: 'Lista de servicios activos e inactivos',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder',
  })
  getAll() {
    return this.servicesService.getAll();
  }

  // Obtiene únicamente los servicios activos.
  //coemntado por:Lautaro-dev
  // Es la consulta principal para clientes o vistas públicas.
  //coemntado por:Lautaro-dev
  @Get()
  @ApiResponse({
    status: 200,
    description: 'Lista de Servicios activos',
  })
  @ApiResponse({
    status: 403,
    description: 'Error al acceder a la lista de servicios activos',
  })
  getAllActive() {
    return this.servicesService.getAllActive();
  }

  // Obtiene un servicio específico por su id.
  //coemntado por:Lautaro-dev
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de un servicios',
  })
  @ApiResponse({
    status: 403,
    description: 'No existe el servicio con ese id',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Servicio actualizado',
  })
  @ApiResponse({
    status: 403,
    description: 'No existe el servicio con ese id',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  // Crea un nuevo servicio.
  //coemntado por:Lautaro-dev
  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Servicio creado con exito',
  })
  @ApiResponse({
    status: 403,
    description: 'El servicio no pudo ser creado',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Servicio desactivado',
  })
  @ApiResponse({
    status: 403,
    description: 'No existe el servicio con ese id',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Servicio reactivado',
  })
  @ApiResponse({
    status: 403,
    description: 'No existe el servicio con ese id',
  })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.reactivate(id);
  }

  @Get(':serviceId/professionals')
  async getProfessionalsByService(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.servicesService.getProfessionalsByService(serviceId);
  }
}
