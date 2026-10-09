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
  ApiOperation,
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
    required: true,
    type: String,
    description:
      'ID del profesional en formato UUID para consultar sus fechas bloqueadas',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener los bloqueos horarios e inasistencias de un profesional',
    description:
      'Devuelve una lista cronológica de todos los rangos de fechas bloqueadas en los que el profesional no puede recibir citas. Accesible por Administradores y Profesionales.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de bloqueos configurados obtenida con éxito (puede retornar un arreglo vacío si no tiene inasistencias registradas).',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId enviado en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario autenticado no posee el rol de ADMIN o PROFESSIONAL (ej. un CLIENT).',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar los registros de bloqueos.',
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
  @ApiParam({
    name: 'professionalId',
    required: true,
    type: String,
    description:
      'ID del profesional en formato UUID al cual se le registrará la inasistencia o bloqueo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Crear un bloqueo de fechas o inasistencia para un profesional',
    description:
      'Registra un rango de tiempo (vacaciones, licencias, etc.) en el cual el profesional no podrá recibir turnos. Los administradores pueden configurarlo para cualquiera, mientras que los profesionales solo pueden bloquear su propia agenda.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bloqueo temporal de agenda creado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId no es un UUID válido, las fechas no cumplen el formato ISO, o la fecha de inicio es posterior a la de finalización.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o intentó crear un bloqueo para otro profesional sin autorización.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El profesional ya posee un bloqueo registrado que se superpone con el rango de fechas seleccionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar persistir el bloqueo en la base de datos.',
  })
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

    return this.professionalUnavailabilityService.create(professionalId, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID del bloqueo o inasistencia a eliminar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Eliminar un bloqueo de fechas o inasistencia',
    description:
      'Remueve físicamente el registro de inasistencia de la base de datos, liberando la agenda en ese rango. Los administradores pueden eliminar cualquiera, mientras que los profesionales solo pueden borrar sus propios bloqueos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bloqueo eliminado exitosamente de la agenda.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID provisto en la ruta no cumple con el formato UUID válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o intentó eliminar el bloqueo de otro profesional sin autorización.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún registro de bloqueo con el ID proporcionado en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar remover el registro de la base de datos.',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: any) {
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
