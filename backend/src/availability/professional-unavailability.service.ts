import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProfessionalUnavailabilityRepository } from './professional-unavailability.repository';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';

@Injectable()
export class ProfessionalUnavailabilityService {
  constructor(
    private readonly repository:
      ProfessionalUnavailabilityRepository,
  ) {}

  async getByProfessionalId(
    professionalId: string,
  ) {
    return this.repository.getByProfessionalId(
      professionalId,
    );
  }

  async create(
    professionalId: string,
    data: CreateProfessionalUnavailabilityDto,
  ) {
    if (data.startDate > data.endDate) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior o igual a la fecha de finalización',
      );
    }

    const overlapping =
      await this.repository.getOverlapping(
        professionalId,
        data.startDate,
        data.endDate,
      );

    if (overlapping) {
      throw new ConflictException(
        'El profesional ya posee un bloqueo dentro del rango de fechas seleccionado',
      );
    }

    return this.repository.create(
      professionalId,
      data,
    );
  }

  async delete(id: string): Promise<void> {
    const unavailability =
      await this.repository.getById(id);

    if (!unavailability) {
      throw new NotFoundException(
        `No se encontró el bloqueo con id ${id}`,
      );
    }

    await this.repository.delete(id);
  }

  async getById(id: string) {
  const unavailability = await this.repository.getById(id);

  if (!unavailability) {
    throw new NotFoundException(
      `No se encontró el bloqueo con id ${id}`,
    );
  }

  return unavailability;
}
}