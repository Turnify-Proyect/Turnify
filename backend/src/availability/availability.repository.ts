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

  async getById(id: string): Promise<Availability | null> {
    return this.ormAvailabilityRepository.findOne({
      where: { id },
      relations: {
        professional: true,
      },
    });
  }

  async getByProfessionalId(professionalId: string): Promise<Availability[]> {
    return this.ormAvailabilityRepository.find({
      where: { professional: { id: professionalId } },
    });
  }

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

  async update(id: string, data: UpdateAvailabilityDto): Promise<void> {
    await this.ormAvailabilityRepository.update(id, data);
  }

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

  async delete(id: string): Promise<void> {
    await this.ormAvailabilityRepository.delete(id);
  }
}
