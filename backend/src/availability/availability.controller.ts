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
import { ApiErrorSwaggerResponse } from '../common/api/api-error-response.decorator';
import { Availability } from './entities/availability.entity';
import { ApiSuccessCreatedResponse } from 'src/common/api';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Roles } from 'src/decorators/roles.decorators';
import { UserRole } from 'src/common/userRoles.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApiSuccessArrayResponse } from 'src/common/api';
import { ApiSuccessResponse } from 'src/common/api';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Obtiene todas las disponibilidades configuradas
  //coemntado por:Lautaro-dev
  // para un profesional específico.
  //coemntado por:Lautaro-dev
  @Get('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    description: 'ID del profesional',
    type: String,
  })
  @ApiSuccessArrayResponse(Availability)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para actualizar la disponibilidad',
  )
  @ApiErrorSwaggerResponse(404, 'Disponibilidad no encontrada')
  getByProfessionalId(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.availabilityService.getByProfessionalId(professionalId);
  }

  // Actualiza parcialmente una disponibilidad existente.
  //coemntado por:Lautaro-dev
  // El id corresponde al bloque de disponibilidad que se quiere modificar.
  //coemntado por:Lautaro-dev
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'ID del bloque de disponibilidad',
    type: String,
  })
  @ApiSuccessArrayResponse(Availability)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para actualizar la disponibilidad',
  )
  @ApiErrorSwaggerResponse(404, 'Disponibilidad no encontrada')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, data);
  }

  // Crea un nuevo bloque de disponibilidad
  //coemntado por:Lautaro-dev
  // asociado al profesional indicado en la URL.
  //coemntado por:Lautaro-dev
  @Post('professional/:professionalId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    description: 'ID del profesional',
    type: String,
  })
  @ApiSuccessCreatedResponse(Availability)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para crear la disponibilidad')
  @ApiErrorSwaggerResponse(404, 'Profesional no encontrado')
  create(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() data: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(professionalId, data);
  }

  // Elimina una disponibilidad específica.
  //coemntado por:Lautaro-dev
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'ID de disponibilidad',
    type: String,
  })
  @ApiSuccessResponse(Object)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para eliminar la disponibilidad')
  @ApiErrorSwaggerResponse(404, 'Disponibilidad no encontrada')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.delete(id);
  }
}
