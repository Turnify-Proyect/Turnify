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
    throw new NotFoundException(
      'No existe la categoría seleccionada',
    );
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

  // Obtiene todos los servicios, tanto activos como inactivos.
  //coemntado por:Lautaro-dev
  async getAll(): Promise<Service[]> {
    return this.servicesRepository.getAll();
  }

  // Obtiene únicamente los servicios que están activos.
  //coemntado por:Lautaro-dev
  async getAllActive(): Promise<Service[]> {
    return this.servicesRepository.getAllActive();
  }

  // Busca un servicio por id.
  //coemntado por:Lautaro-dev
  // Si no existe, devuelve un error 404.
  //coemntado por:Lautaro-dev
  async getById(id: string): Promise<Service> {
    const service = await this.servicesRepository.getById(id);

    if (!service) {
      throw new NotFoundException(`Service with id ${id} not found`);
    }

    return service;
  }

  // Valida que el nombre del servicio no esté siendo utilizado
  //coemntado por:Lautaro-dev
  // por otro servicio.
  //coemntado por:Lautaro-dev
  //
  //coemntado por:Lautaro-dev
  // currentServiceId se utiliza durante un update para permitir
  //coemntado por:Lautaro-dev
  // que un servicio conserve su propio nombre sin generar conflicto.
  //coemntado por:Lautaro-dev
  private async validateNameAvailability(
    name: string,
    currentServiceId?: string,
  ): Promise<void> {
    const existingService = await this.servicesRepository.getByName(name);

    if (existingService && existingService.id !== currentServiceId) {
      throw new ConflictException(`Service with name ${name} already exists`);
    }
  }

  async update(id: string, data: UpdateServiceDto,): Promise<Service> {
    await this.getById(id);

    if (data.name) {
      await this.validateNameAvailability(data.name, id);
    }

    const category = data.categoryId
      ? await this.getCategory(data.categoryId)
      : undefined;

    await this.servicesRepository.update(
      id,
      data,
      category,
    );

  return this.getById(id);
}
  // Crea un nuevo servicio luego de validar
  //coemntado por:Lautaro-dev
  // que no exista otro con el mismo nombre.
  //coemntado por:Lautaro-dev
  async create(data: CreateServiceDto): Promise<Service> {
  await this.validateNameAvailability(data.name);

  const category = await this.getCategory(
    data.categoryId,
  );

  return this.servicesRepository.create(
    data,
    category,
  );
}

  // Realiza una baja lógica del servicio.
  //coemntado por:Lautaro-dev
  // El registro permanece en la base con isActive = false.
  //coemntado por:Lautaro-dev
  async deactivate(id: string): Promise<Service> {
    await this.getById(id);

    await this.servicesRepository.deactivate(id);

    return this.getById(id);
  }

  // Reactiva un servicio previamente desactivado,
  //coemntado por:Lautaro-dev
  // cambiando nuevamente isActive a true.
  //coemntado por:Lautaro-dev
  async reactivate(id: string): Promise<Service> {
    await this.getById(id);

    await this.servicesRepository.reactivate(id);

    return this.getById(id);
  }

  async getProfessionalsByService(serviceId: string) {
    return this.servicesRepository.getProfessionalsByService(serviceId);
  }
}
