import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentsRepository } from './appointments.repository';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from './entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  async createAppointment(createAppointmentDto: CreateAppointmentDto) {
    return await this.appointmentsRepository.createAppointment(
      createAppointmentDto,
    );
  }

  async getAllAppointments() {
    return await this.appointmentsRepository.getAllAppointments();
  }

  async getAppointmentById(id: string) {
    return await this.appointmentsRepository.getAppointmentById(id);
  }

  async getAppointmentsByUserId(userId: string) {
    return await this.appointmentsRepository.getAppointmentsByUserId(userId);
  }

  async getAppointmentsByProfessionalId(professionalId: string) {
    return await this.appointmentsRepository.getAppointmentsByProfessionalId(
      professionalId,
    );
  }

  async cancelAppointment(id: string) {
    return await this.appointmentsRepository.cancelAppointment(id);
  }

  async rescheduleAppointment(
    id: string,
    rescheduleAppointmentDto: RescheduleAppointmentDto,
  ) {
    return await this.appointmentsRepository.rescheduleAppointment(
      id,
      rescheduleAppointmentDto,
    );
  }

  async completeAppointment(id: string) {
    return await this.appointmentsRepository.completeAppointment(id);
  }

  async updateAppointmentStatus(
    id: string,
    newStatus: AppointmentStatus,
  ) {
    return await this.appointmentsRepository.updateAppointmentStatus(
      id,
      newStatus,
    );
  }
}