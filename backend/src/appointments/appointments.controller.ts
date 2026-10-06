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
import { ApiErrorSwaggerResponse } from '../common/api/api-error-response.decorator';
import { ApiSuccessResponse } from 'src/common/api';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Appointment } from './entities/appointment.entity';
import { ApiSuccessArrayResponse } from 'src/common/api';
import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';
import { AppointmentOwnerOrAdminGuard } from '../auth/guards/appointment-owner-or-admin.guard';
import { AvailableSlotsResponseDto } from './dto/available-slots-response.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessArrayResponse(Appointment)
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para acceder')
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
  @ApiSuccessArrayResponse(Appointment)
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'El usuario no tiene permisos para acceder a sus turnos',
  )
  getMyAppointments(@Req() req: any) {
    return this.appointmentsService.getAppointmentsByUserId(req.user.id);
  }

  @Get('available-slots')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse(AvailableSlotsResponseDto)
  @ApiErrorSwaggerResponse(400, 'Parámetros inválidos o UUID incorrecto')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para consultar disponibilidad')
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
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID de la cita',
    type: String,
  })
  @ApiSuccessResponse(Appointment)
  @ApiErrorSwaggerResponse(
    400,
    'El ID de la cita no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para acceder')
  @ApiErrorSwaggerResponse(404, 'Cita no encontrada')
  getAppointmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessArrayResponse(Appointment)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del usuario no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para acceder')
  getAppointmentsByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.appointmentsService.getAppointmentsByUserId(userId);
  }

  @Get('professional/:professionalId')
  @ApiSuccessArrayResponse(Appointment)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del profesional no tiene un formato UUID válido',
  )
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
  @ApiSuccessResponse(String)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del turno no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'El usuario no tiene permiso para cancelar este turno',
  )
  @ApiErrorSwaggerResponse(404, 'Turno no encontrado')
  cancelAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.cancelAppointment(id);
  }

  @Put(':id/reschedule')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard, AppointmentOwnerOrAdminGuard)
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
  @ApiSuccessResponse(Appointment)
  @ApiErrorSwaggerResponse(
    400,
    'El ID o los datos de reprogramación no son válidos',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(
    403,
    'El usuario no tiene permiso para reprogramar este turno',
  )
  @ApiErrorSwaggerResponse(404, 'Turno no encontrado')
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
  @ApiSuccessResponse(Appointment)
  @ApiErrorSwaggerResponse(
    400,
    'El ID del turno no tiene un formato UUID válido',
  )
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para completar el turno')
  @ApiErrorSwaggerResponse(404, 'Turno no encontrado')
  completeAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.completeAppointment(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse(Appointment)
  @ApiErrorSwaggerResponse(400, 'El ID o el estado enviado no son válidos')
  @ApiErrorSwaggerResponse(401, 'Token no enviado, inválido o expirado')
  @ApiErrorSwaggerResponse(403, 'Sin permisos para modificar el estado')
  @ApiErrorSwaggerResponse(404, 'Turno no encontrado')
  updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') newStatus: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, newStatus);
  }
}
