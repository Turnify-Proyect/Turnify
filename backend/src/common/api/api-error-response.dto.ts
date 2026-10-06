import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({
    example: 'VALIDATION_ERROR',
  })
  code!: string;

  @ApiProperty({
    example: 400,
  })
  statusCode!: number;

  @ApiPropertyOptional({
    type: [String],
    example: [
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ],
  })
  details?: string[];
}

export class ApiErrorResponseDto {
  @ApiProperty({
    type: Boolean,
    example: false,
  })
  success!: false;

  @ApiProperty({
    example: 'Hay errores de validación en los datos enviados',
  })
  message!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: null,
  })
  data!: null;

  @ApiProperty({
    type: ApiErrorDto,
  })
  errors!: ApiErrorDto;
}
