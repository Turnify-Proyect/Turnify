import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ProfessionalSpecialty } from '../entities/professional.entity';

export class CreateProfessionalDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ProfessionalSpecialty)
  @IsNotEmpty()
  specialty!: ProfessionalSpecialty;
}
