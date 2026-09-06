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

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Obtiene todos los servicios, incluidos los inactivos.
  // Esta ruta está pensada para uso administrativo.
  @Get('all')
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
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getById(id);
  }

  // Actualiza parcialmente un servicio existente.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  // Crea un nuevo servicio.
  @Post()
  create(@Body() data: CreateServiceDto) {
    return this.servicesService.create(data);
  }

  // Realiza una baja lógica del servicio.
  // El registro se conserva en la base, pero pasa a isActive = false.
  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.deactivate(id);
  }

  // Reactiva un servicio previamente desactivado.
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.reactivate(id);
  }
}
