import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error-response.dto';

const ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export function ApiErrorSwaggerResponse(status: number, description: string) {
  const errorCode = ERROR_CODES[status] ?? 'INTERNAL_SERVER_ERROR';

  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiResponse({
      status,
      description,
      content: {
        'application/json': {
          schema: {
            allOf: [
              {
                $ref: getSchemaPath(ApiErrorResponseDto),
              },
            ],
            example: {
              success: false,
              error: {
                code: errorCode,
                message: description,
                details: [],
              },
            },
          },
        },
      },
    }),
  );
}
