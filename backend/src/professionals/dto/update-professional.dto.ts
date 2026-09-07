import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessionalDto } from './create-professional.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ProfessionalSpecialty } from '../entities/professional.entity';

export class UpdateProfessionalDto {
  @IsOptional()
  @IsEnum(ProfessionalSpecialty)
  specialty?: ProfessionalSpecialty;
}