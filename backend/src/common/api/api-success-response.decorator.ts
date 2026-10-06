import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from './api-success-response.dto';

export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
) {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({
      description: 'Respuesta exitosa',
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
