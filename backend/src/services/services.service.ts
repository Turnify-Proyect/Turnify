import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesRepository } from './services.repository';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async getAll(): Promise<Service[]> {
    return await this.servicesRepository.getAll();
  }

  async getAllActive(): Promise<Service[]> {
    return await this.servicesRepository.getAllActive();
  }

  async getById(id: string): Promise<Service> {
    const service = await this.servicesRepository.getById(id);
    if (!service) {
      throw new NotFoundException(`Service with id ${id} not found`);
    }
    return service;
  }

  private async validateNameAvailability(
    name: string,
    currentServiceId?: string,
  ): Promise<void> {
    const existingService = await this.servicesRepository.getByName(name);
    if (existingService && existingService.id !== currentServiceId) {
      throw new ConflictException(`Service with name ${name} already exists`);
    }
  }

  async update(id: string, data: UpdateServiceDto): Promise<Service> {
    await this.getById(id);
    if (data.name) {
      await this.validateNameAvailability(data.name, id);
    }
    await this.servicesRepository.update(id, data);

    return this.getById(id);
  }

  async create(data: CreateServiceDto): Promise<Service> {
    await this.validateNameAvailability(data.name);
    return await this.servicesRepository.create(data);
  }

  async deactivate(id: string): Promise<Service> {
    await this.getById(id);

    await this.servicesRepository.deactivate(id);

    return this.getById(id);
  }

  async reactivate(id: string): Promise<Service> {
    await this.getById(id);
    await this.servicesRepository.reactivate(id);
    return this.getById(id);
  }
}
