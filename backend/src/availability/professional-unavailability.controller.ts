import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiErrorSwaggerResponse } from 'src/common/api/api-error-response.decorator';
import { ApiSuccessCreatedResponse } from 'src/common/api';
import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';
import { ProfessionalUnavailability } from './entities/professional-unavailability.entity';
import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiSuccessArrayResponse } from 'src/common/api';
import { ApiSuccessResponse } from 'src/common/api';

@Controller('availability/blocks')
export class ProfessionalUnavailabilityController {
  constructor(private readonly service: ProfessionalUnavailabilityService) {}

  @Get('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    type: String,
  })
  @ApiSuccessArrayResponse(ProfessionalUnavailability)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del profesional no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para consultar los bloqueos')
  getByProfessionalId(
    @Param('professionalId', ParseUUIDPipe)
    professionalId: string,
  ) {
    return this.service.getByProfessionalId(professionalId);
  }

  @Post('professional/:professionalId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessCreatedResponse(ProfessionalUnavailability)
  @ApiParam({
    name: 'professionalId',
    type: String,
  })
  @ApiErrorSwaggerResponse(400, 'El ID o los datos enviados no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para crear el bloqueo')
  @ApiErrorSwaggerResponse(404, 'Profesional no encontrado')
  create(
    @Param('professionalId', ParseUUIDPipe)
    professionalId: string,
    @Body()
    data: CreateProfessionalUnavailabilityDto,
  ) {
    return this.service.create(professionalId, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    type: String,
  })
  @ApiSuccessResponse(Object)
  @ApiErrorSwaggerResponse(400, 'El ID no tiene un formato UUID válido')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para eliminar el bloqueo')
  @ApiErrorSwaggerResponse(404, 'Bloqueo no encontrado')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
