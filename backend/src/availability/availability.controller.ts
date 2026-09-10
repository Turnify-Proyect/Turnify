import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Roles } from 'src/decorators/roles.decorators';
import { UserRole } from 'src/common/userRoles.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Obtiene todas las disponibilidades configuradas
  // para un profesional específico.
  @Get('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    description: 'ID del profesional',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de disponibilidades para el profesional',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin disponibilidad para el profesional',
  })
  getByProfessionalId(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.availabilityService.getByProfessionalId(professionalId);
  }

  // Actualiza parcialmente una disponibilidad existente.
  // El id corresponde al bloque de disponibilidad que se quiere modificar.
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'ID del bloque de disponibilidad',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para actualizar la disponibilidad',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, data);
  }

  // Crea un nuevo bloque de disponibilidad
  // asociado al profesional indicado en la URL.
  @Post('professional/:professionalId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    description: 'ID del profesional',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Disponibilidad creada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para crear la disponibilidad',
  })
  create(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() data: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(professionalId, data);
  }

  // Elimina una disponibilidad específica.
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'ID de disponibilidad',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad eliminada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para eliminar la disponibilidad',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.delete(id);
  }
}
