import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ProfessionalService } from 'src/professionals/entities/professional-service.entity';

@Injectable()
export class ServicesRepository {
  constructor(
    @InjectRepository(Service)
    private readonly ormServiceRepository: Repository<Service>,
    @InjectRepository(ProfessionalService)
    private readonly professionalServicesRepository: Repository<ProfessionalService>,
  ) {}

  // Obtiene todos los servicios registrados,
  //coemntado por:Lautaro-dev
  // incluyendo los que están inactivos.
  //coemntado por:Lautaro-dev
  async getAll(): Promise<Service[]> {
    return this.ormServiceRepository.find();
  }

  // Obtiene únicamente los servicios que se encuentran activos.
  //coemntado por:Lautaro-dev
  async getAllActive(): Promise<Service[]> {
    return this.ormServiceRepository.find({
      where: {
        isActive: true,
      },
    });
  }

  // Busca un servicio por su nombre.
  //coemntado por:Lautaro-dev
  // Se utiliza principalmente para validar nombres duplicados.
  //coemntado por:Lautaro-dev
  async getByName(name: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({
      name,
    });
  }

  // Busca un servicio específico por su id.
  //coemntado por:Lautaro-dev
  async getById(id: string): Promise<Service | null> {
    return this.ormServiceRepository.findOneBy({
      id,
    });
  }

  // Actualiza parcialmente un servicio existente.
  //coemntado por:Lautaro-dev
  // Las validaciones de existencia y reglas de negocio
  //coemntado por:Lautaro-dev
  // se realizan previamente en el service.
  //coemntado por:Lautaro-dev
  async update(id: string, data: UpdateServiceDto): Promise<void> {
    await this.ormServiceRepository.update(id, data);
  }

  // Crea una instancia de Service y luego la persiste
  //coemntado por:Lautaro-dev
  // en la base de datos.
  //coemntado por:Lautaro-dev
  async create(data: CreateServiceDto): Promise<Service> {
    const service = this.ormServiceRepository.create(data);

    return this.ormServiceRepository.save(service);
  }

  // Realiza la baja lógica de un servicio
  //coemntado por:Lautaro-dev
  // cambiando su estado a inactivo.
  //coemntado por:Lautaro-dev
  async deactivate(id: string): Promise<void> {
    await this.ormServiceRepository.update(id, {
      isActive: false,
    });
  }

  // Reactiva un servicio previamente desactivado.
  //coemntado por:Lautaro-dev
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
}
