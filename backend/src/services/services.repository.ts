import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesRepository {
  constructor(
    @InjectRepository(Service)
    private readonly ormServiceRepository: Repository<Service>,
  ) {}

  async getAll(): Promise<Service[]> {
    return this.ormServiceRepository.find();
  }

  async getAllActive(): Promise<Service[]> {
    return this.ormServiceRepository.find({ where: { isActive: true } });
  }

  async getByName(name: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({ name });
  }

  async getById(id: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({ id });
  }

  async update(id: string, data: UpdateServiceDto): Promise<void> {
    await this.ormServiceRepository.update(id, data);
  }

  async create(data: CreateServiceDto): Promise<Service> {
    const service = this.ormServiceRepository.create(data);
    return this.ormServiceRepository.save(service);
  }
  async deactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, {
      isActive: false,
    });
  }

  async reactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, { isActive: true });
  }
}
