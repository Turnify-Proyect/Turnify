import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Professional } from "./entities/professional.entity";
import { Repository } from "typeorm";
import { CreateProfessionalDto } from "./dto/create-professional.dto";
import { UpdateProfessionalDto } from "./dto/update-professional.dto";
import { User } from "src/users/entities/user.entity";
import { ProfessionalService } from "./entities/professional-service.entity";
import { Service } from "src/services/entities/service.entity";


@Injectable()
export class ProfessionalsRepository {
  constructor(
    @InjectRepository(Professional)
    private readonly professionalsrepository: Repository<Professional>,
    @InjectRepository(User)
    private readonly usersrepository: Repository<User>,

    @InjectRepository(ProfessionalService)
    private readonly professionalServicesRepository: Repository<ProfessionalService>,

    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,

  ) {}

  async getActiveProfessionals(): Promise<Professional[]> {
  return  await this.professionalsrepository.find({
    where: { isActive: true },
    relations: {
      user: true,
      professionalServices: {
        service: true,
      },
      availabilities: true,
    },
  });
  }

  async getAllProfessionals(): Promise<Professional[]>{
    return await this.professionalsrepository.find({
        relations:{
            user: true,
            professionalServices:{
                service: true,
            },
            availabilities: true,
        },
    });
  }

  async getProfessionalById(id: string): Promise<Professional | null> {

    const professional = await this.professionalsrepository.findOne({
      where: { id },
      relations: {
        user: true,
        professionalServices: {
          service: true,
        },
        availabilities: true,
      },
    });

    if (!professional) {
      throw new NotFoundException(
        'No existe un profesional con el ID proporcionado',
      );
    }

    return professional;
  }  

  async createProfessional(createProfessionalDto: CreateProfessionalDto): Promise<Professional> {
    const user = await this.usersrepository.findOne({
      where: { id: createProfessionalDto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        'No existe un usuario con el ID proporcionado',
      );
    }

    if (user.role !== 'professional') {
      throw new ConflictException(
        'El usuario no tiene rol de profesional, no se puede crear un perfil de profesional para este usuario',
      );
    }

    const existingProfessional = await this.professionalsrepository.findOne({
      where: {
        user: {
          id: createProfessionalDto.userId,
        },
      },
    });

    if (existingProfessional) {
      throw new ConflictException(
        'Ya existe un profesional para este usuario',
      );
    }

    const professional = this.professionalsrepository.create({
    specialty: createProfessionalDto.specialty,
    user: {
      id: createProfessionalDto.userId,
    },
  });
  return this.professionalsrepository.save(professional);
  }

  async updateProfessional(id: string, updateProfessionalDto: UpdateProfessionalDto): Promise<string> {

    const professionalExists = await this.professionalsrepository.findOne({ where: { id } });
    if (!professionalExists) {
      throw new NotFoundException('No existe un profesional con el ID proporcionado');
    }

    await this.professionalsrepository.update(id, updateProfessionalDto);

    return "Profesional actualizado correctamente";
  }
   
  async softDeleteProfessional(id:string): Promise<string> {

    const professionalExists = await this.professionalsrepository.findOne({ where: { id } });
    if (!professionalExists) {
      throw new NotFoundException('No existe un profesional con el ID proporcionado');
    }

    await this.professionalsrepository.update(id, { isActive: false });
    return "Profesional eliminado correctamente";
  }

  async activateProfessional(id:string): Promise<string> {

    const professionalExists = await this.professionalsrepository.findOne({ where: { id }  } );
    if (!professionalExists) {
      throw new NotFoundException('No existe un profesional con el ID proporcionado');
  
    }
    
    if (professionalExists.isActive) {
      throw new ConflictException('El profesional ya está activo');
    }
    
    await this.professionalsrepository.update(id, { isActive: true });
    return "Profesional activado correctamente";
  }
  
  async associateService(professionalId: string, serviceId: string,): Promise<ProfessionalService> {
    const professional = await this.professionalsrepository.findOne({
    where: { id: professionalId },
    });

    if (!professional) {
    throw new NotFoundException(
      'No existe un profesional con el ID proporcionado',
    );
    }

    if (!professional.isActive) {
    throw new ConflictException(
      'No se pueden asociar servicios a un profesional inactivo',
    );
    }

    const service = await this.servicesRepository.findOne({
    where: { id: serviceId },
    });

    if (!service) {
    throw new NotFoundException(
      'No existe un servicio con el ID proporcionado',
    );
    }

    if (!service.isActive) {
    throw new ConflictException(
      'No se puede asociar un servicio inactivo',
    );
    }

  const existingAssociation =
    await this.professionalServicesRepository.findOne({
      where: {
        professionalId,
        serviceId,
      },
    });

  if (existingAssociation) {
    throw new ConflictException(
      'El servicio ya se encuentra asociado al profesional',
    );
  }

  const professionalService =
    this.professionalServicesRepository.create({
      professionalId,
      serviceId,
      professional,
      service,
    });

  return this.professionalServicesRepository.save(
    professionalService,
  );
}

async getServicesByProfessional(professionalId: string,): Promise<ProfessionalService[]> {
  const professional = await this.professionalsrepository.findOne({
    where: { id: professionalId },
  });

  if (!professional) {
    throw new NotFoundException(
      'No existe un profesional con el ID proporcionado',
    );
  }

  return this.professionalServicesRepository.find({
    where: { professionalId },
    relations: {
      service: true,
    },
  });
}

async removeServiceFromProfessional(professionalId: string, serviceId: string,): Promise<string> {
  const professional = await this.professionalsrepository.findOne({
    where: { id: professionalId },
  });

  if (!professional) {
    throw new NotFoundException(
      'No existe un profesional con el ID proporcionado',
    );
  }

  const service = await this.servicesRepository.findOne({
    where: { id: serviceId },
  });

  if (!service) {
    throw new NotFoundException(
      'No existe un servicio con el ID proporcionado',
    );
  }

  const association = await this.professionalServicesRepository.findOne({
    where: {
      professionalId,
      serviceId,
    },
  });

  if (!association) {
    throw new NotFoundException(
      'El servicio no se encuentra asociado al profesional',
    );
  }

  await this.professionalServicesRepository.remove(association);

  return "Servicio eliminado del profesional correctamente";
}


}