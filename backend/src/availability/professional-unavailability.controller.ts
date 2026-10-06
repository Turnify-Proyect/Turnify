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

import {
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';

import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('availability/blocks')
export class ProfessionalUnavailabilityController {
  constructor(
    private readonly service:
      ProfessionalUnavailabilityService,
  ) {}

  @Get('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description:
      'Bloqueos configurados para el profesional',
  })
  getByProfessionalId(
    @Param('professionalId', ParseUUIDPipe)
    professionalId: string,
  ) {
    return this.service.getByProfessionalId(
      professionalId,
    );
  }

  @Post('professional/:professionalId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Bloqueo creado',
  })
  create(
    @Param('professionalId', ParseUUIDPipe)
    professionalId: string,
    @Body()
    data: CreateProfessionalUnavailabilityDto,
  ) {
    return this.service.create(
      professionalId,
      data,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Bloqueo eliminado',
  })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(id);
  }
}