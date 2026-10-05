import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorCode } from './api-error-code.enum';
import { ApiErrorResponse } from './api-error.interface';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const status = this.getStatus(exception);

    const errorResponse = this.buildErrorResponse(exception, status);

    response.status(status).json(errorResponse);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildErrorResponse(
    exception: unknown,
    status: number,
  ): ApiErrorResponse {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      return this.handleHttpException(exceptionResponse, status);
    }

    return {
      success: false,
      message: 'Ocurrió un error interno en el servidor',
      data: null,
      errors: {
        code: ApiErrorCode.INTERNAL_ERROR,
        statusCode: status,
      },
    };
  }

  private handleHttpException(
    exceptionResponse: string | object,
    status: number,
  ): ApiErrorResponse {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return {
          success: false,
          message: 'Hay errores de validación en los datos enviados',
          data: null,
          errors: {
            code: ApiErrorCode.VALIDATION_ERROR,
            statusCode: status,
            details: message.map((item) => String(item)),
          },
        };
      }

      if (typeof message === 'string') {
        return {
          success: false,
          message: message,
          data: null,
          errors: {
            code: this.getErrorCode(status),
            statusCode: status,
          },
        };
      }
    }

    if (typeof exceptionResponse === 'string') {
      return {
        success: false,
        message: exceptionResponse,
        data: null,
        errors: {
          code: this.getErrorCode(status),
          statusCode: status,
        },
      };
    }

    return {
      success: false,
      message: this.getDefaultMessage(status),
      data: null,
      errors: {
        code: this.getErrorCode(status),
        statusCode: status,
      },
    };
  }

  private getErrorCode(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ApiErrorCode.UNPROCESSABLE_ENTITY;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.TOO_MANY_REQUESTS;
      default:
        return ApiErrorCode.INTERNAL_ERROR;
    }
  }

  private getDefaultMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'La solicitud no es válida';
      case HttpStatus.UNAUTHORIZED:
        return 'No estás autenticado';
      case HttpStatus.FORBIDDEN:
        return 'No tenés permisos para realizar esta operación';
      case HttpStatus.NOT_FOUND:
        return 'El recurso solicitado no existe';
      case HttpStatus.CONFLICT:
        return 'La operación genera un conflicto';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'La información enviada no puede ser procesada';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Demasiadas solicitudes';
      default:
        return 'Ocurrió un error interno';
    }
  }
}
