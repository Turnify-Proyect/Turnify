import {Controller,Get,Post,Body,Patch,Param,Delete,Put,ParseUUIDPipe,} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from './entities/appointment.entity';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.createAppointment(createAppointmentDto);
  }

  @Get()
  getAllAppointments() {
    return this.appointmentsService.getAllAppointments();
  }

  @Get(':id')
  getAppointmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Get('user/:userId')
  getAppointmentsByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
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
  rescheduleAppointment(@Param('id', ParseUUIDPipe) id: string, @Body() rescheduleAppointmentDto: RescheduleAppointmentDto,) 
  {
    return this.appointmentsService.rescheduleAppointment(
      id,
      rescheduleAppointmentDto,
    );
  }

  //Rol profesional: Completar un turno
  @Patch(':id/complete')
  completeAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.completeAppointment(id);
  }

  //Rol ADMIN: cambiar el estado de un turno
  @Patch(':id/status')
  updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') newStatus: AppointmentStatus,
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, newStatus);
  }



}
