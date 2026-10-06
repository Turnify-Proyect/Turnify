import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

/**
 * Documenta una respuesta exitosa que no devuelve datos
 * (por ejemplo un DELETE). El interceptor responde con data: null.
 *
 * Uso:
 *   @ApiSuccessNoDataResponse()
 *   @ApiSuccessNoDataResponse('Disponibilidad eliminada')
 */
export function ApiSuccessNoDataResponse(message?: string) {
  return applyDecorators(
    ApiOkResponse({
      description: 'Respuesta exitosa sin datos',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: message ?? 'Operación realizada con éxito',
          },
          data: {
            type: 'object',
            example: null,
            nullable: true,
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
