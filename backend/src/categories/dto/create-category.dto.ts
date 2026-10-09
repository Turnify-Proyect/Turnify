import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre único de la categoría para agrupar los servicios',
    maxLength: 100,
    example: 'Barbería y Peluquería',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Nombre o identificador del icono representativo para la interfaz (ej. nombre de FontAwesome o Lucide)',
    maxLength: 20,
    example: 'scissors',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string;
}
