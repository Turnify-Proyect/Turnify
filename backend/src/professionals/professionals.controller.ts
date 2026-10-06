import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiSuccessCreatedResponse } from 'src/common/api';
import { Service } from 'src/services/entities/service.entity';
import { Professional } from './entities/professional.entity';
import { ApiSuccessArrayResponse } from 'src/common/api';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { Roles } from '../decorators/roles.decorators';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiErrorSwaggerResponse } from 'src/common/api/api-error-response.decorator';
import { ApiSuccessResponse } from 'src/common/api';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessCreatedResponse(Professional)
  @ApiErrorSwaggerResponse(400, 'Los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para crear un profesional')
  @ApiErrorSwaggerResponse(
    409,
    'El profesional ya existe o existe un conflicto con sus datos',
  )
  async createProfessional(
    @Body() createProfessionalDto: CreateProfessionalDto,
  ) {
    return this.professionalsService.createProfessional(createProfessionalDto);
  }

  @Get()
  @ApiSuccessArrayResponse(Professional)
  async getActiveProfessionals() {
    return this.professionalsService.getActiveProfessionals();
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessArrayResponse(Professional)
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para acceder a la lista de profesionales',
  )
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
  @ApiSuccessResponse(Professional)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para acceder a la información del profesional',
  )
  @ApiErrorSwaggerResponse(404, 'Profesional no encontrado')
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
  @ApiSuccessResponse(Professional)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para realizar esta operación')
  @ApiErrorSwaggerResponse(404, 'Profesional no encontrado')
  @ApiErrorSwaggerResponse(
    409,
    'El profesional ya existe o existe un conflicto con sus datos',
  )
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
  @ApiSuccessResponse(Professional)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para realizar esta operación')
  @ApiErrorSwaggerResponse(404, 'Profesional no encontrado')
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
  @ApiSuccessResponse(Professional)
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para realizar esta operación')
  @ApiErrorSwaggerResponse(404, 'Profesional no encontrado')
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
  @ApiSuccessResponse(Object)
  @ApiErrorSwaggerResponse(
    400,
    'Uno de los IDs no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para asociar el servicio al profesional',
  )
  @ApiErrorSwaggerResponse(404, 'Profesional o servicio no encontrado')
  @ApiErrorSwaggerResponse(409, 'El servicio ya está asociado al profesional')
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
  @ApiSuccessArrayResponse(Service)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del profesional no tiene un formato UUID válido',
  )
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
  @ApiSuccessResponse(Object)
  @ApiErrorSwaggerResponse(
    400,
    'Uno de los IDs no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'Sin permisos para eliminar el servicio del profesional',
  )
  @ApiErrorSwaggerResponse(404, 'Profesional o servicio no encontrado')
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
