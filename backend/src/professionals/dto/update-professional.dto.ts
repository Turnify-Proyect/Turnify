import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessionalDto } from './create-professional.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ProfessionalSpecialty } from '../entities/professional.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfessionalDto {
  @ApiPropertyOptional({
    description: 'Nueva especialidad asignada al profesional',
    enum: ProfessionalSpecialty,
    example: ProfessionalSpecialty.MASAJES,
  })
  @IsOptional()
  @IsEnum(ProfessionalSpecialty)
  specialty?: ProfessionalSpecialty;
}
