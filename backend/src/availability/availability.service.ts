import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AvailabilityRepository } from './availability.repository';
import { Availability, DayOfWeek } from './entities/availability.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
  ) {}

  // Normaliza las horas al formato HH:mm.
  // PostgreSQL puede devolver valores TIME como "09:00:00".
  private normalizeTime(time: string): string {
    return time.slice(0, 5);
  }

  // Valida que el horario de inicio sea anterior al horario de finalización.
  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be earlier than end time');
    }
  }

  // Valida que el nuevo rango horario no se superponga con otra
  // disponibilidad del mismo profesional y del mismo día.
  //
  // currentAvailabilityId se utiliza durante un update para ignorar
  // la propia disponibilidad que se está modificando.
  private async validateNoOverlap(
    professionalId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    currentAvailabilityId?: string,
  ): Promise<void> {
    const availabilities =
      await this.availabilityRepository.getByProfessionalAndDay(
        professionalId,
        dayOfWeek,
      );

    // Normalizamos tanto el nuevo horario como los ya almacenados
    // para compararlos siempre utilizando el mismo formato.
    const normalizedStartTime = this.normalizeTime(startTime);
    const normalizedEndTime = this.normalizeTime(endTime);

    const overlapping = availabilities.some((availability) => {
      const existingStartTime = this.normalizeTime(availability.startTime);

      const existingEndTime = this.normalizeTime(availability.endTime);

      return (
        availability.id !== currentAvailabilityId &&
        normalizedStartTime < existingEndTime &&
        normalizedEndTime > existingStartTime
      );
    });

    if (overlapping) {
      throw new ConflictException(
        'Availability overlaps with an existing time range',
      );
    }
  }

  // Obtiene todas las disponibilidades configuradas
  // para un profesional específico.
  async getByProfessionalId(professionalId: string): Promise<Availability[]> {
    return this.availabilityRepository.getByProfessionalId(professionalId);
  }

  // Actualiza parcialmente una disponibilidad existente.
  // Los valores que no llegan en el DTO se toman de la disponibilidad actual
  // para poder validar el rango completo antes de actualizar.
  async update(id: string, data: UpdateAvailabilityDto): Promise<Availability> {
    // Evita ejecutar un PATCH sin ningún dato para modificar.
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided to update');
    }

    const availability = await this.availabilityRepository.getById(id);

    // Verifica que la disponibilidad exista antes de modificarla.
    if (!availability) {
      throw new NotFoundException(`Availability with id ${id} not found`);
    }

    // Si un campo no viene en el PATCH,
    // se conserva el valor que ya estaba almacenado.
    const startTime = data.startTime ?? availability.startTime;

    const endTime = data.endTime ?? availability.endTime;

    const dayOfWeek = data.dayOfWeek ?? availability.dayOfWeek;

    this.validateTimeRange(startTime, endTime);

    // Valida el horario resultante contra las demás disponibilidades
    // del mismo profesional y día.
    await this.validateNoOverlap(
      availability.professional.id,
      dayOfWeek,
      startTime,
      endTime,
      id,
    );

    await this.availabilityRepository.update(id, data);

    // Devuelve la disponibilidad luego de aplicar la actualización.
    return (await this.availabilityRepository.getById(id))!;
  }

  // Crea una nueva disponibilidad para un profesional
  // después de validar el rango horario y posibles superposiciones.
  async create(professionalId: string, data: CreateAvailabilityDto) {
    this.validateTimeRange(data.startTime, data.endTime);

    await this.validateNoOverlap(
      professionalId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
    );

    return this.availabilityRepository.create(professionalId, data);
  }

  // Elimina una disponibilidad luego de verificar que exista.
  async delete(id: string): Promise<void> {
    const availability = await this.availabilityRepository.getById(id);

    if (!availability) {
      throw new NotFoundException(`Availability with id ${id} not found`);
    }

    await this.availabilityRepository.delete(id);
  }
}
