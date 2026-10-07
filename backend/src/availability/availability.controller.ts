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
  ForbiddenException, 
  Req, 
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Roles } from 'src/decorators/roles.decorators';
import { UserRole } from 'src/common/userRoles.enum';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('availability')
export class AvailabilityController {
  constructor(
  private readonly availabilityService: AvailabilityService,
  private readonly professionalsService: ProfessionalsService,
)  {}

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

@Patch(':id')
@Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
async update(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() data: UpdateAvailabilityDto,
  @Req() request: any,
) {
  const availability = await this.availabilityService.getById(id);

  await this.validateProfessionalOwnership(
    availability.professional.id,
    request.user,
  );

  return this.availabilityService.update(id, data);
}

@Post('professional/:professionalId')
@Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
create(
  @Param('professionalId', ParseUUIDPipe) professionalId: string,
  @Body() data: CreateAvailabilityDto,
  @Req() request: any,
) {
  return this.createAuthorized(
    professionalId,
    data,
    request.user,
  );
}

private async createAuthorized(
  professionalId: string,
  data: CreateAvailabilityDto,
  user: any,
) {
  if (user.roles?.includes(UserRole.PROFESSIONAL)) {
    const professional =
      await this.professionalsService.getProfessionalByUserId(user.id);

    if (professional.id !== professionalId) {
      throw new ForbiddenException(
        'No tenés permiso para modificar la disponibilidad de otro profesional',
      );
    }
  }

  return this.availabilityService.create(
    professionalId,
    data,
  );
}

  // Elimina una disponibilidad específica.
  @Delete(':id')
@Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
async delete(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() request: any,
) {
  const availability = await this.availabilityService.getById(id);

  await this.validateProfessionalOwnership(
    availability.professional.id,
    request.user,
  );

  return this.availabilityService.delete(id);
}

  private async validateProfessionalOwnership(
  professionalId: string,
  user: any,
): Promise<void> {
  if (!user.roles?.includes(UserRole.PROFESSIONAL)) {
    return;
  }

  const professional =
    await this.professionalsService.getProfessionalByUserId(user.id);

  if (professional.id !== professionalId) {
    throw new ForbiddenException(
      'No tenés permiso para modificar la disponibilidad de otro profesional',
    );
  }
}
}
