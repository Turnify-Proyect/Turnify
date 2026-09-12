import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Availability, DayOfWeek } from './entities/availability.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { Professional } from 'src/professionals/entities/professional.entity';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilityRepository {
  constructor(
    @InjectRepository(Availability)
    private readonly ormAvailabilityRepository: Repository<Availability>,
  ) {}

  // Busca una disponibilidad por su id.
  //coemntado por:Lautaro-dev
  // También carga la relación con Professional porque el service
  //coemntado por:Lautaro-dev
  // necesita conocer a qué profesional pertenece durante un update.
  //coemntado por:Lautaro-dev
  async getById(id: string): Promise<Availability | null> {
    return this.ormAvailabilityRepository.findOne({
      where: { id },
      relations: {
        professional: true,
      },
    });
  }

  // Obtiene todas las disponibilidades asociadas a un profesional.
  //coemntado por:Lautaro-dev
  async getByProfessionalId(professionalId: string): Promise<Availability[]> {
    return this.ormAvailabilityRepository.find({
      where: {
        professional: {
          id: professionalId,
        },
      },
    });
  }

  // Obtiene únicamente las disponibilidades de un profesional
  //coemntado por:Lautaro-dev
  // para un día específico de la semana.
  //coemntado por:Lautaro-dev
  // Se usa principalmente para validar superposiciones de horarios.
  //coemntado por:Lautaro-dev
  async getByProfessionalAndDay(
    professionalId: string,
    dayOfWeek: DayOfWeek,
  ): Promise<Availability[]> {
    return this.ormAvailabilityRepository.find({
      where: {
        professional: {
          id: professionalId,
        },
        dayOfWeek,
      },
    });
  }

  // Actualiza parcialmente una disponibilidad existente.
  //coemntado por:Lautaro-dev
  // La validación de existencia y reglas de negocio se realiza en el service.
  //coemntado por:Lautaro-dev
  async update(id: string, data: UpdateAvailabilityDto): Promise<void> {
    await this.ormAvailabilityRepository.update(id, data);
  }

  // Crea una nueva disponibilidad y la asocia
  //coemntado por:Lautaro-dev
  // al profesional indicado mediante su id.
  //coemntado por:Lautaro-dev
  async create(
    professionalId: string,
    data: CreateAvailabilityDto,
  ): Promise<Availability> {
    const availability = this.ormAvailabilityRepository.create({
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      professional: {
        id: professionalId,
      } as Professional,
    });

    return this.ormAvailabilityRepository.save(availability);
  }

  // Elimina físicamente una disponibilidad.
  //coemntado por:Lautaro-dev
  // La verificación de existencia se realiza previamente en el service.
  //coemntado por:Lautaro-dev
  async delete(id: string): Promise<void> {
    await this.ormAvailabilityRepository.delete(id);
  }
}
