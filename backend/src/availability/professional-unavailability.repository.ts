import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProfessionalUnavailability } from './entities/professional-unavailability.entity';
import { Professional } from '../professionals/entities/professional.entity';
import { CreateProfessionalUnavailabilityDto } from './dto/create-professional-unavailability.dto';

@Injectable()
export class ProfessionalUnavailabilityRepository {
  constructor(
    @InjectRepository(ProfessionalUnavailability)
    private readonly ormRepository: Repository<ProfessionalUnavailability>,
  ) {}

  async getById(
    id: string,
  ): Promise<ProfessionalUnavailability | null> {
    return this.ormRepository.findOne({
      where: { id },
      relations: {
        professional: true,
      },
    });
  }

  async getByProfessionalId(
    professionalId: string,
  ): Promise<ProfessionalUnavailability[]> {
    return this.ormRepository.find({
      where: {
        professional: {
          id: professionalId,
        },
      },
      order: {
        startDate: 'ASC',
      },
    });
  }

  async getOverlapping(
    professionalId: string,
    startDate: string,
    endDate: string,
  ): Promise<ProfessionalUnavailability | null> {
    return this.ormRepository
      .createQueryBuilder('unavailability')
      .where(
        'unavailability.professional_id = :professionalId',
        { professionalId },
      )
      .andWhere(
        'unavailability.start_date <= :endDate',
        { endDate },
      )
      .andWhere(
        'unavailability.end_date >= :startDate',
        { startDate },
      )
      .getOne();
  }

  async create(
    professionalId: string,
    data: CreateProfessionalUnavailabilityDto,
  ): Promise<ProfessionalUnavailability> {
    const unavailability =
      this.ormRepository.create({
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason?.trim() || null,
        professional: {
          id: professionalId,
        } as Professional,
      });

    return this.ormRepository.save(
      unavailability,
    );
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }
}