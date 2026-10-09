import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Put,
  ParseUUIDPipe,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from './entities/appointment.entity';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { AppointmentOwnerOrAdminGuard } from '../auth/guards/appointment-owner-or-admin.guard';


@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener todas las citas',
    description:
      'Devuelve la lista de todas las citas. Solo accesible para usuarios con rol de administrador o profesional.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder',
  })
  getAllAppointments() {
    return this.appointmentsService.getAllAppointments();
  }

  @Get('me')
  @Roles(UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener los turnos del usuario autenticado',
    description:
      'Devuelve la lista de turnos del usuario correspondiente al token JWT enviado en la cabecera Authorization. No requiere enviar el ID del usuario por parámetro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de turnos del usuario autenticado',
  })
  @ApiResponse({
    status: 401,
    description: 'Token no enviado, inválido o expirado',
  })
  getMyAppointments(@Req() req: any) {
    return this.appointmentsService.getAppointmentsByUserId(req.user.id);
  }

  @Get('available-slots')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener los turnos disponibles para un profesional y servicio en una fecha específica',
    description:
      'Devuelve la lista de turnos disponibles para un profesional y servicio en una fecha específica. Solo accesible para usuarios con rol de cliente o administrador.',
  })
  getAvailableSlots(
    @Query('professionalId', ParseUUIDPipe)
    professionalId: string,

    @Query('serviceId', ParseUUIDPipe)
    serviceId: string,

    @Query('date')
    date: string,

    @Query('appointmentId')
    appointmentId?: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      professionalId,
      serviceId,
      date,
      appointmentId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener una cita por ID',
    description:
      'Devuelve la información de una cita específica según su ID. Solo accesible para usuarios con rol de administrador, profesional o cliente.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Cita encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
  })
  getAppointmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener citas por ID de usuario',
    description:
      'Devuelve la lista de citas asociadas a un usuario específico según su ID. Solo accesible para usuarios con rol de administrador.',
  })
  getAppointmentsByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.appointmentsService.getAppointmentsByUserId(userId);
  }

  @Get('professional/:professionalId')
  @ApiOperation({
    summary: 'Obtener citas por ID de profesional',
    description:
      'Devuelve la lista de citas asociadas a un profesional específico según su ID. Solo accesible para usuarios con rol de administrador o profesional.',
  })
  getAppointmentsByProfessionalId(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.appointmentsService.getAppointmentsByProfessionalId(
      professionalId,
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard, AppointmentOwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancelar un turno',
    description:
      'Permite cancelar un turno existente. Solo el propietario del turno o un administrador pueden realizar esta acción.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID del turno a cancelar',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Turno cancelado correctamente',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para cancelar este turno',
  })
  @ApiResponse({
    status: 404,
    description: 'Turno no encontrado',
  })
  cancelAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.cancelAppointment(id);
  }

  @Put(':id/reschedule')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard, AppointmentOwnerOrAdminGuard)
  @ApiOperation({
    summary: 'Reprogramar un turno',
    description:
      'Permite reprogramar un turno existente. Solo el propietario del turno o un administrador pueden realizar esta acción.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID del turno a reprogramar',
    type: String,
  })
  @ApiOperation({
    summary: 'Reprogramar un turno',
    description:
      'Permite reprogramar un turno existente. Solo el propietario del turno o un administrador pueden realizar esta acción.',
  })
  @ApiResponse({
    status: 200,
    description: 'Turno reprogramado correctamente',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para reprogramar este turno',
  })
  @ApiResponse({
    status: 404,
    description: 'Turno no encontrado',
  })
  rescheduleAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rescheduleAppointmentDto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleAppointment(
      id,
      rescheduleAppointmentDto,
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marcar un turno como completado',
    description:
      'Permite marcar un turno existente como completado. Solo accesible para usuarios con rol de administrador o profesional.',
  })
  completeAppointment(@Param('id', ParseUUIDPipe) id: string,@Req() req: any,) {
  return this.appointmentsService.completeAppointment(
    id,
    req.user.id,
    req.user.roles,
    );
  }

  @Patch(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL,)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marcar un turno como ausente (no show)',
    description:
      'Permite marcar un turno existente como no show. Solo accesible para usuarios con rol de administrador o profesional.',
  })
  markAppointmentNoShow(@Param('id', ParseUUIDPipe) id: string, @Req() req: any,) {
  return this.appointmentsService.markAppointmentNoShow(
    id,
    req.user.id,
    req.user.roles,
  );}

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar el estado de un turno',
    description:
      'Permite actualizar el estado de un turno existente. Solo accesible para usuarios con rol de administrador.',
  })
  updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') newStatus: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, newStatus);
  }
}
