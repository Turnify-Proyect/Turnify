import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProfessionalUnavailabilityDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  reason?: string;
}
