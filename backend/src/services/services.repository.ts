import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ProfessionalService } from 'src/professionals/entities/professional-service.entity';
import { Category } from '../categories/category.entity';

@Injectable()
export class ServicesRepository {
  constructor(
    @InjectRepository(Service)
    private readonly ormServiceRepository: Repository<Service>,
    @InjectRepository(ProfessionalService)
    private readonly professionalServicesRepository: Repository<ProfessionalService>,
  ) {}

  async getAll(): Promise<Service[]> {
    return this.ormServiceRepository.find({
      relations: {
        category: true,
      },
    });
  }

  async getAllActive(): Promise<Service[]> {
    return this.ormServiceRepository.find({
      where: {
        isActive: true,
      },
      relations: {
        category: true,
      },
    });
  }

  async getByName(name: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({
      name,
    });
  }

  async getById(id: string): Promise<Service | null> {
    return this.ormServiceRepository.findOne({
      where: {
        id,
      },
      relations: {
        category: true,
      },
    });
  }

  async create(data: CreateServiceDto, category: Category): Promise<Service> {
    const { categoryId, ...serviceData } = data;

    const service = this.ormServiceRepository.create({
      ...serviceData,
      category,
    });

    const saved = await this.ormServiceRepository.save(service);

    return (await this.getById(saved.id))!;
  }

  async update(
    id: string,
    data: UpdateServiceDto,
    category?: Category,
  ): Promise<void> {
    const service = await this.ormServiceRepository.findOneBy({
      id,
    });

    if (!service) {
      throw new NotFoundException(
        'No existe un servicio con el ID proporcionado',
      );
    }

    const { categoryId, ...serviceData } = data;

    Object.assign(service, serviceData);

    if (category) {
      service.category = category;
    }

    await this.ormServiceRepository.save(service);
  }

  async deactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, {
      isActive: false,
    });
  }

  async reactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, {
      isActive: true,
    });
  }

  async getProfessionalsByService(
    serviceId: string,
  ): Promise<ProfessionalService[]> {
    const service = await this.ormServiceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(
        'No existe un servicio con el ID proporcionado',
      );
    }

    return this.professionalServicesRepository.find({
      where: { serviceId },
      relations: {
        professional: {
          user: true,
        },
      },
    });
  }

  async updateServiceImage(
    serviceId: string,
    imageUrl: string,
  ): Promise<Service> {
    const service = await this.ormServiceRepository.findOneBy({
      id: serviceId,
    });

    if (!service) {
      throw new NotFoundException(
        `No existe un servicio con el ID proporcionado`,
      );
    }

    service.imageUrl = imageUrl;
    return this.ormServiceRepository.save(service);
  }
}
