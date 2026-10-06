import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from './api-success-response.dto';

export function ApiSuccessArrayResponse<TModel extends Type<unknown>>(
  model: TModel,
) {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({
      description: 'Respuesta exitosa (Listado)',
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
            type: 'array',
            items: {
              $ref: getSchemaPath(model),
            },
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
