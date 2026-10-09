import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ProfessionalSpecialty } from '../entities/professional.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfessionalDto {
  @ApiProperty({
    description: 'ID del usuario existente que será promovido a profesional (Debe ser un UUID válido)',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Especialidad asignada al profesional',
    enum: ProfessionalSpecialty,
    example: ProfessionalSpecialty.COSMETOLOGIA,
  })
  @IsEnum(ProfessionalSpecialty)
  @IsNotEmpty()
  specialty!: ProfessionalSpecialty;
}
