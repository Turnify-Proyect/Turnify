import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Nombre único del servicio',
    maxLength: 100,
    example: 'Corte de Cabello Caballero',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de lo que incluye el servicio',
    example: 'Incluye lavado con champú premium, asesoría de imagen y peinado con cera.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'ID de la categoría a la que pertenece el servicio (Debe ser un UUID válido)',
    format: 'uuid',
    example: 'a6b8c9d0-1234-5678-abcd-ef1234567890',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description: 'Precio del servicio representado como una cadena numérica',
    example: '1500.00',
  })
  @IsNumberString()
  price!: string;

  @ApiProperty({
    description: 'Duración estimada del servicio en minutos (Mínimo 1 minuto)',
    minimum: 1,
    type: Number,
    example: 45,
  })
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional({
    description: 'URL de la imagen representativa del servicio alojada en la nube',
    example: 'https://cloudinary.com',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
