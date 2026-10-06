import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error-response.dto';

const ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

export function ApiErrorSwaggerResponse(status: number, description: string) {
  const errorCode = ERROR_CODES[status] ?? 'INTERNAL_ERROR';

  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiResponse({
      status,
      description,
      content: {
        'application/json': {
          schema: {
            $ref: getSchemaPath(ApiErrorResponseDto),
          },
          example: {
            success: false,
            message: description,
            data: null,
            errors: {
              code: errorCode,
              statusCode: status,
            },
          },
        },
      },
    }),
  );
}
