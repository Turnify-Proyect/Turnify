import { Injectable } from '@nestjs/common';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { ProfessionalsRepository } from './professionals.repository';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly professionalsRepository: ProfessionalsRepository) {}

  async createProfessional(createProfessionalDto: CreateProfessionalDto) {
    return this.professionalsRepository.createProfessional(createProfessionalDto);
  }

  async getActiveProfessionals() {
    return  this.professionalsRepository.getActiveProfessionals();
  }

  async getAllProfessionals() {
    return  this.professionalsRepository.getAllProfessionals();
  }

  async getProfessionalById(id: string) {
    return  this.professionalsRepository.getProfessionalById(id);
  }

  async updateProfessional(id: string, updateProfessionalDto: UpdateProfessionalDto) {
    return  this.professionalsRepository.updateProfessional(id, updateProfessionalDto);
  }

  async softDeleteProfessional(id: string) {
    return  this.professionalsRepository.softDeleteProfessional(id);
  }

  async activateProfessional(id: string) {
    return  this.professionalsRepository.activateProfessional(id);
  }

  async associateService(professionalId: string, serviceId: string) {
    return this.professionalsRepository.associateService(professionalId, serviceId);
  }

  async getServicesByProfessional(professionalId: string) {
    return this.professionalsRepository.getServicesByProfessional(professionalId);
  }

  async removeServiceFromProfessional(professionalId: string, serviceId: string) {
    return this.professionalsRepository.removeServiceFromProfessional(professionalId, serviceId);
  }
}
