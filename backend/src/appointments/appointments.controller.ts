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
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from './entities/appointment.entity';

import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorators';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/userRoles.enum';

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
  createAppointment(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(
      createAppointmentDto,
    );
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
  getAppointmentById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Get('user/:userId')
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
  cancelAppointment(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.cancelAppointment(id);
  }

  @Put(':id/reschedule')
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
  completeAppointment(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.completeAppointment(id);
  }

  @Patch(':id/status')
  updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') newStatus: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(
      id,
      newStatus,
    );
  }
}