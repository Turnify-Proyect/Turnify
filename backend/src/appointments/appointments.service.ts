import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsRepository } from './appointments.repository';

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

  update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return `This action updates a #${id} appointment`;
  }

  remove(id: number) {
    return `This action removes a #${id} appointment`;
  }
}
