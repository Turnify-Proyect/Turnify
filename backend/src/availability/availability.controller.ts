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
import {
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  @Get('professional/:professionalId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'professionalId',
    required: true,
    type: String,
    description:
      'ID del profesional en formato UUID para consultar su agenda de trabajo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener la agenda de disponibilidad de un profesional',
    description:
      'Devuelve una lista con todos los bloques de días y horarios configurados para el profesional. Accesible por Administradores, Profesionales y Clientes.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de disponibilidades obtenida con éxito (puede retornar un arreglo vacío si aún no tiene horarios configurados).',
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
      'Prohibido: El usuario autenticado no posee un rol válido en el sistema.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al consultar los registros de la agenda.',
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
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID de la disponibilidad horaria a actualizar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Actualizar parcialmente un bloque de disponibilidad',
    description:
      'Permite modificar el día o las horas de un bloque de atención existente. Los administradores pueden editar cualquiera, mientras que los profesionales solo pueden modificar los suyos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El ID no es un UUID válido, el formato de hora falló, o no se enviaron campos en el cuerpo de la solicitud.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o intentó modificar la agenda de otro profesional sin autorización.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún bloque de disponibilidad registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar actualizar los registros en la base de datos.',
  })
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
  @ApiParam({
    name: 'professionalId',
    required: true,
    type: String,
    description:
      'ID del profesional en formato UUID al cual se le asignará el bloque de disponibilidad',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Crear un bloque de disponibilidad horaria para un profesional',
    description:
      'Registra un día de la semana y un rango horario de atención. Los administradores pueden configurarlo para cualquier profesional, mientras que los profesionales solo pueden modificar su propia agenda.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bloque de disponibilidad creado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Petición inválida: El professionalId no es un UUID válido o los formatos del DTO fallaron la validación de formato HH:mm.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: Token no enviado, inválido o expirado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Prohibido: El usuario no cuenta con el rol requerido o está intentando modificar la agenda de otro profesional sin ser Administrador.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto: El rango de tiempo es inválido o se superpone con un bloque horario existente para ese mismo día.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar persistir los datos en la agenda.',
  })
  create(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() data: CreateAvailabilityDto,
    @Req() request: any,
  ) {
    return this.createAuthorized(professionalId, data, request.user);
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

    return this.availabilityService.create(professionalId, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description:
      'ID del bloque de disponibilidad horaria a eliminar en formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Eliminar un bloque de disponibilidad horaria',
    description:
      'Remueve físicamente un rango de atención de la agenda. Los administradores pueden eliminar cualquiera, mientras que los profesionales solo pueden borrar sus propios bloques horarios.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bloque de disponibilidad eliminado exitosamente.',
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
      'Prohibido: El usuario no cuenta con el rol requerido o intentó eliminar la agenda de otro profesional sin autorización.',
  })
  @ApiResponse({
    status: 404,
    description:
      'No encontrado: No existe ningún bloque de disponibilidad registrado con el ID proporcionado.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Error interno del servidor al intentar remover el registro de la base de datos.',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: any) {
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
