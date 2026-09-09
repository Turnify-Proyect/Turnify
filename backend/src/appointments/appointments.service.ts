import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentsRepository } from './appointments.repository';

@Injectable()
export class AppointmentsService {
  create(createAppointmentDto: CreateAppointmentDto) {
    return 'Cita creada';
  }

  findAll() {
    return `Todas las citas encontradas`;
  }

  findOne(id: number) {
    return `La cita #${id} ha sido encontrada`;
  }

  update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return `La cita #${id} ha sido actualizada`;
  }

  remove(id: number) {
    return `La cita #${id} ha sido eliminada`;
  }
}
