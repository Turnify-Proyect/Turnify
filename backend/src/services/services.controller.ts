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

  @Get('all')
  getAll() {
    return this.servicesService.getAll();
  }

  @Get()
  getAllActive() {
    return this.servicesService.getAllActive();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  @Post()
  create(@Body() data: CreateServiceDto) {
    return this.servicesService.create(data);
  }
  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.deactivate(id);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.reactivate(id);
  }

  @Get(':serviceId/professionals')
  async getProfessionalsByService(@Param('serviceId', ParseUUIDPipe) serviceId: string,) {
  return this.servicesService.getProfessionalsByService(serviceId);
}
}
