import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Put,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
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

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Cita creada',
  })
  @ApiResponse({
    status: 403,
    description: 'Error para crear la cita',
  })
  createAppointment(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.createAppointment(createAppointmentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
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
  getAppointmentsByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.appointmentsService.getAppointmentsByUserId(userId);
  }

  @Get('professional/:professionalId')
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
  completeAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.completeAppointment(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') newStatus: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, newStatus);
  }
}
