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

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be earlier than end time');
    }
  }

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

    const overlapping = availabilities.some(
      (availability) =>
        availability.id !== currentAvailabilityId &&
        startTime < availability.endTime &&
        endTime > availability.startTime,
    );

    if (overlapping) {
      throw new ConflictException(
        'Availability overlaps with an existing time range',
      );
    }
  }

  async getByProfessionalId(professionalId: string): Promise<Availability[]> {
    return this.availabilityRepository.getByProfessionalId(professionalId);
  }

  async update(id: string, data: UpdateAvailabilityDto): Promise<Availability> {
    const availability = await this.availabilityRepository.getById(id);

    if (!availability) {
      throw new NotFoundException(`Availability with id ${id} not found`);
    }

    const startTime = data.startTime ?? availability.startTime;
    const endTime = data.endTime ?? availability.endTime;
    const dayOfWeek = data.dayOfWeek ?? availability.dayOfWeek;

    this.validateTimeRange(startTime, endTime);

    await this.validateNoOverlap(
      availability.professional.id,
      dayOfWeek,
      startTime,
      endTime,
      id,
    );

    await this.availabilityRepository.update(id, data);

    return (await this.availabilityRepository.getById(id))!;
  }

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

  async delete(id: string): Promise<void> {
    const availability = await this.availabilityRepository.getById(id);

    if (!availability) {
      throw new NotFoundException(`Availability with id ${id} not found`);
    }

    await this.availabilityRepository.delete(id);
  }
}
