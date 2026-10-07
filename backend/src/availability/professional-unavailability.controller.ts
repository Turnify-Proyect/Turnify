import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { ProfessionalUnavailabilityService } from './professional-unavailability.service';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';
import { ProfessionalsService } from '../professionals/professionals.service';

import { Roles } from '../decorators/roles.decorators';
import { UserRole } from '../common/userRoles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('availability/blocks')
export class ProfessionalUnavailabilityController {
  constructor(
  private readonly professionalUnavailabilityService: ProfessionalUnavailabilityService,
  private readonly professionalsService: ProfessionalsService,
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
    return this.professionalUnavailabilityService.getByProfessionalId(
      professionalId,
    );
  }

  @Post('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  async create(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() data: CreateProfessionalUnavailabilityDto,
    @Req() request: any,
  ) {
    if (request.user.roles?.includes(UserRole.PROFESSIONAL)) {
      const professional =
        await this.professionalsService.getProfessionalByUserId(
          request.user.id,
        );

      if (professional.id !== professionalId) {
        throw new ForbiddenException(
          'No tenés permiso para crear bloqueos para otro profesional',
        );
      }
    }

    return this.professionalUnavailabilityService.create(
      professionalId,
      data,
    );
  }

  @Delete(':id')
@Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
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
async delete(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() request: any,
) {
  const unavailability =
    await this.professionalUnavailabilityService.getById(id);

  if (request.user.roles?.includes(UserRole.PROFESSIONAL)) {
    const professional =
      await this.professionalsService.getProfessionalByUserId(
        request.user.id,
      );

    if (professional.id !== unavailability.professional.id) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar bloqueos de otro profesional',
      );
    }
  }

  return this.professionalUnavailabilityService.delete(id);
}
}