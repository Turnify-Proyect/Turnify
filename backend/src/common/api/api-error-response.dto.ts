import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetailDto {
  @ApiPropertyOptional({
    example: 'email',
  })
  field?: string;

  @ApiPropertyOptional({
    example: 'INVALID_EMAIL',
  })
  code?: string;

  @ApiProperty({
    example: 'El email no tiene un formato válido',
  })
  message!: string;
}

export class ApiErrorDto {
  @ApiProperty({
    example: 'VALIDATION_ERROR',
  })
  code!: string;

  @ApiProperty({
    example: 'Hay errores de validación',
  })
  message!: string;

  @ApiPropertyOptional({
    type: [ApiErrorDetailDto],
  })
  details?: ApiErrorDetailDto[];
}

export class ApiErrorResponseDto {
  @ApiProperty({
    example: false,
  })
  success!: false;

  @ApiProperty({
    type: ApiErrorDto,
  })
  error!: ApiErrorDto;
}
