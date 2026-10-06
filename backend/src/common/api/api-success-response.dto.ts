import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponseDto<T> {
  @ApiProperty({
    type: 'boolean',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    type: 'string',
    example: 'Operación realizada con éxito',
  })
  message!: string;

  @ApiProperty({
    description: 'Datos de la respuesta',
  })
  data!: T;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: null,
    nullable: true,
    description: 'Detalles de errores si existen',
  })
  errors!: null;
}
