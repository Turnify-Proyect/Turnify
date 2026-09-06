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

  // Obtiene todos los servicios registrados,
  // incluyendo los que están inactivos.
  async getAll(): Promise<Service[]> {
    return this.ormServiceRepository.find();
  }

  // Obtiene únicamente los servicios que se encuentran activos.
  async getAllActive(): Promise<Service[]> {
    return this.ormServiceRepository.find({
      where: {
        isActive: true,
      },
    });
  }

  // Busca un servicio por su nombre.
  // Se utiliza principalmente para validar nombres duplicados.
  async getByName(name: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({
      name,
    });
  }

  // Busca un servicio específico por su id.
  async getById(id: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({
      id,
    });
  }

  // Actualiza parcialmente un servicio existente.
  // Las validaciones de existencia y reglas de negocio
  // se realizan previamente en el service.
  async update(id: string, data: UpdateServiceDto): Promise<void> {
    await this.ormServiceRepository.update(id, data);
  }

  // Crea una instancia de Service y luego la persiste
  // en la base de datos.
  async create(data: CreateServiceDto): Promise<Service> {
    const service = this.ormServiceRepository.create(data);

    return this.ormServiceRepository.save(service);
  }

  // Realiza la baja lógica de un servicio
  // cambiando su estado a inactivo.
  async deactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, {
      isActive: false,
    });
  }

  // Reactiva un servicio previamente desactivado.
  async reactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, {
      isActive: true,
    });
  }
}
