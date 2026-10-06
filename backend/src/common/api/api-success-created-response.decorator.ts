import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiSuccessResponseDto } from './api-success-response.dto';

export function ApiSuccessCreatedResponse<TModel extends Type<unknown>>(
  model: TModel,
) {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiCreatedResponse({
      description: 'Recurso creado correctamente',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operación realizada con éxito',
          },
          data: {
            $ref: getSchemaPath(model),
          },
          errors: {
            type: 'object',
            example: null,
            nullable: true,
          },
        },
      },
    }),
  );
}
