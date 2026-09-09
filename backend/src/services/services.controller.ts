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

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Obtiene todos los servicios, incluidos los inactivos.
  // Esta ruta está pensada para uso administrativo.
  @Get('all')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  getAll() {
    return this.servicesService.getAll();
  }

  // Obtiene únicamente los servicios activos.
  // Es la consulta principal para clientes o vistas públicas.
  @Get()
  getAllActive() {
    return this.servicesService.getAllActive();
  }

  // Obtiene un servicio específico por su id.
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getById(id);
  }

  // Actualiza parcialmente un servicio existente.
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  // Crea un nuevo servicio.
  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  create(@Body() data: CreateServiceDto) {
    return this.servicesService.create(data);
  }

  // Realiza una baja lógica del servicio.
  // El registro se conserva en la base, pero pasa a isActive = false.
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.deactivate(id);
  }

  // Reactiva un servicio previamente desactivado.
  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.reactivate(id);
  }

  @Get(':serviceId/professionals')
  async getProfessionalsByService(@Param('serviceId', ParseUUIDPipe) serviceId: string,) {
  return this.servicesService.getProfessionalsByService(serviceId);
}
}
