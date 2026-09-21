import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Profesional creado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para crear un profesional',
  })
  async createProfessional(
    @Body() createProfessionalDto: CreateProfessionalDto,
  ) {
    return this.professionalsService.createProfessional(createProfessionalDto);
  }

  @Get()
  async getActiveProfessionals() {
    return this.professionalsService.getActiveProfessionals();
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los profesionales',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a la lista de profesionales',
  })
  async getAllProfessionals() {
    return this.professionalsService.getAllProfessionals();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a la información del profesional',
  })
  @ApiResponse({
    status: 404,
    description: 'Profesional no encontrado',
  })
  async getProfessionalById(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.getProfessionalById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional actualizado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para actualizar la información del profesional',
  })
  @ApiResponse({
    status: 404,
    description: 'Profesional no encontrado',
  })
  async updateProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.updateProfessional(
      id,
      updateProfessionalDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional eliminado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para eliminar al profesional',
  })
  @ApiResponse({
    status: 404,
    description: 'Profesional no encontrado',
  })
  async softDeleteProfessional(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.softDeleteProfessional(id);
  }

  @Put(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del profesional',
  })
  @ApiResponse({
    status: 200,
    description: 'Profesional activado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para activar al profesional',
  })
  @ApiResponse({
    status: 404,
    description: 'Profesional no encontrado',
  })
  async activateProfessional(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.activateProfessional(id);
  }

  @Post(':professionalId/services/:serviceId')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio asociado al profesional exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para asociar el servicio al profesional',
  })
  @ApiResponse({
    status: 404,
    description: 'Servicio no encontrado',
  })
  async associateService(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.professionalsService.associateService(
      professionalId,
      serviceId,
    );
  }

  @Get(':professionalId/services')
  async getServicesByProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.professionalsService.getServicesByProfessional(professionalId);
  }

  @Delete(':professionalId/services/:serviceId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'serviceId',
    required: true,
    type: String,
    description: 'ID del servicio',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio eliminado del profesional exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para eliminar el servicio del profesional',
  })
  @ApiResponse({
    status: 404,
    description: 'Servicio no encontrado',
  })
  async removeServiceFromProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.professionalsService.removeServiceFromProfessional(
      professionalId,
      serviceId,
    );
  }
}
