import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesRepository } from './services.repository';
import { Service } from './entities/service.entity';
import { CloudinaryService } from '../config/cloudinary.service';
import { CategoriesRepository } from '../categories/categories.repository';

@Injectable()
export class ServicesService {
  constructor(
    private readonly servicesRepository: ServicesRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  private async getCategory(categoryId: string) {
    const category =
      await this.categoriesRepository.getCategoryById(categoryId);

    if (!category) {
      throw new NotFoundException('No existe la categoría seleccionada');
    }

    if (!category.isActive) {
      throw new ConflictException(
        'La categoría seleccionada se encuentra inactiva',
      );
    }

    return category;
  }

  async updateServiceImage(
    serviceId: string,
    file: Express.Multer.File,
  ): Promise<Service> {
    const cloudinaryResult = await this.cloudinaryService.uploadImage(
      file,
      'turnify/services',
    );
    return this.servicesRepository.updateServiceImage(
      serviceId,
      cloudinaryResult.secure_url,
    );
  }

  async getAll(): Promise<Service[]> {
    return this.servicesRepository.getAll();
  }

  async getAllActive(): Promise<Service[]> {
    return this.servicesRepository.getAllActive();
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

  private async processRemoteImageUrl(
    imageUrl?: string,
  ): Promise<string | undefined> {
    if (!imageUrl) return undefined;

    if (imageUrl.startsWith('https://res.cloudinary.com/')) {
      return imageUrl;
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const result = await this.cloudinaryService.uploadUrl(
          imageUrl,
          'turnify/services',
        );
        return result.secure_url;
      } catch (error) {
        console.warn(
          'Aviso: No se pudo procesar la URL en Cloudinary, conservando original:',
          error,
        );
        return imageUrl;
      }
    }

    return imageUrl;
  }

  async update(id: string, data: UpdateServiceDto): Promise<Service> {
    await this.getById(id);

    if (data.name) {
      await this.validateNameAvailability(data.name, id);
    }

    if (data.imageUrl) {
      data.imageUrl = await this.processRemoteImageUrl(data.imageUrl);
    }

    const category = data.categoryId
      ? await this.getCategory(data.categoryId)
      : undefined;

    await this.servicesRepository.update(id, data, category);

    return this.getById(id);
  }

  async create(data: CreateServiceDto): Promise<Service> {
    await this.validateNameAvailability(data.name);

    if (data.imageUrl) {
      data.imageUrl = await this.processRemoteImageUrl(data.imageUrl);
    }

    const category = await this.getCategory(data.categoryId);

    return this.servicesRepository.create(data, category);
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

  async getProfessionalsByService(serviceId: string) {
    return this.servicesRepository.getProfessionalsByService(serviceId);
  }
}
