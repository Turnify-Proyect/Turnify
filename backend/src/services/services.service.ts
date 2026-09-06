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

  // Obtiene todos los servicios, tanto activos como inactivos.
  async getAll(): Promise<Service[]> {
    return this.servicesRepository.getAll();
  }

  // Obtiene únicamente los servicios que están activos.
  async getAllActive(): Promise<Service[]> {
    return this.servicesRepository.getAllActive();
  }

  // Busca un servicio por id.
  // Si no existe, devuelve un error 404.
  async getById(id: string): Promise<Service> {
    const service = await this.servicesRepository.getById(id);

    if (!service) {
      throw new NotFoundException(`Service with id ${id} not found`);
    }

    return service;
  }

  // Valida que el nombre del servicio no esté siendo utilizado
  // por otro servicio.
  //
  // currentServiceId se utiliza durante un update para permitir
  // que un servicio conserve su propio nombre sin generar conflicto.
  private async validateNameAvailability(
    name: string,
    currentServiceId?: string,
  ): Promise<void> {
    const existingService = await this.servicesRepository.getByName(name);

    if (existingService && existingService.id !== currentServiceId) {
      throw new ConflictException(`Service with name ${name} already exists`);
    }
  }

  // Actualiza parcialmente un servicio existente.
  // Primero verifica que exista y, si se modifica el nombre,
  // valida que no pertenezca a otro servicio.
  async update(id: string, data: UpdateServiceDto): Promise<Service> {
    await this.getById(id);

    if (data.name) {
      await this.validateNameAvailability(data.name, id);
    }

    await this.servicesRepository.update(id, data);

    // Devuelve el servicio luego de aplicar los cambios.
    return this.getById(id);
  }

  // Crea un nuevo servicio luego de validar
  // que no exista otro con el mismo nombre.
  async create(data: CreateServiceDto): Promise<Service> {
    await this.validateNameAvailability(data.name);

    return this.servicesRepository.create(data);
  }

  // Realiza una baja lógica del servicio.
  // El registro permanece en la base con isActive = false.
  async deactivate(id: string): Promise<Service> {
    await this.getById(id);

    await this.servicesRepository.deactivate(id);

    return this.getById(id);
  }

  // Reactiva un servicio previamente desactivado,
  // cambiando nuevamente isActive a true.
  async reactivate(id: string): Promise<Service> {
    await this.getById(id);

    await this.servicesRepository.reactivate(id);

    return this.getById(id);
  }
}
