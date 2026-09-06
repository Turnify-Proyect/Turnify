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
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Obtiene todas las disponibilidades configuradas
  // para un profesional específico.
  @Get('professional/:professionalId')
  getByProfessionalId(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.availabilityService.getByProfessionalId(professionalId);
  }

  // Actualiza parcialmente una disponibilidad existente.
  // El id corresponde al bloque de disponibilidad que se quiere modificar.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, data);
  }

  // Crea un nuevo bloque de disponibilidad
  // asociado al profesional indicado en la URL.
  @Post('professional/:professionalId')
  create(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() data: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(professionalId, data);
  }

  // Elimina una disponibilidad específica.
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.delete(id);
  }
}
