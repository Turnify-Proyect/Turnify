import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
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
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
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
  findAll() {
    return this.appointmentsService.findAll();
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
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(+id);
  }

  @Patch(':id')
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
    description: 'Cita actualizada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
  })
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(+id, updateAppointmentDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
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
    description: 'Cita eliminada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
  })
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(+id);
  }
}
