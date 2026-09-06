import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Put } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  async createProfessional(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalsService.createProfessional(createProfessionalDto);
  }

  @Get()
  async getActiveProfessionals() {
    return this.professionalsService.getActiveProfessionals();
  }

  @Get('admin/all')
  async getAllProfessionals() {
  return this.professionalsService.getAllProfessionals();
  }

  @Get(':id')
  async getProfessionalById(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.getProfessionalById(id);
  }

  @Put(':id')
  async updateProfessional(@Param('id', ParseUUIDPipe) id: string, @Body() updateProfessionalDto: UpdateProfessionalDto) {
    return this.professionalsService.updateProfessional(id, updateProfessionalDto);
  }

  @Delete(':id')
  async softDeleteProfessional(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.softDeleteProfessional(id);
  }

  @Put(':id/activate')
  async activateProfessional(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.activateProfessional(id);
  }

  @Post(':professionalId/services/:serviceId')
  async associateService(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.professionalsService.associateService(professionalId, serviceId);
  }

  @Get(':professionalId/services')
  async getServicesByProfessional(@Param('professionalId', ParseUUIDPipe) professionalId: string) {
    return this.professionalsService.getServicesByProfessional(professionalId);
  }

  @Delete(':professionalId/services/:serviceId')
  async removeServiceFromProfessional(@Param('professionalId', ParseUUIDPipe) professionalId: string, @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
  return this.professionalsService.removeServiceFromProfessional(
    professionalId,
    serviceId,
  );
}
}
