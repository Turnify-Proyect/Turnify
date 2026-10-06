import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ApiErrorCode } from './api-error-code.enum';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  let filter: ApiExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;

  const INTERNAL_MESSAGE = 'Ocurrió un error interno en el servidor';

  beforeEach(() => {
    filter = new ApiExceptionFilter();

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  });

  const getBody = () => response.json.mock.calls[0][0];

  it('debería estar definido', () => {
    expect(filter).toBeDefined();
  });

  // =========================
  // HttpException con message string
  // =========================

  describe('HttpException con message string', () => {
    it('responde con el status y el mensaje de la excepción', () => {
      filter.catch(new BadRequestException('Fecha inválida'), host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledTimes(1);
      expect(getBody()).toEqual({
        success: false,
        message: 'Fecha inválida',
        data: null,
        errors: {
          code: ApiErrorCode.BAD_REQUEST,
          statusCode: 400,
        },
      });
    });

    it.each([
      [new BadRequestException('x'), 400, ApiErrorCode.BAD_REQUEST],
      [new UnauthorizedException('x'), 401, ApiErrorCode.UNAUTHORIZED],
      [new ForbiddenException('x'), 403, ApiErrorCode.FORBIDDEN],
      [new NotFoundException('x'), 404, ApiErrorCode.NOT_FOUND],
      [new ConflictException('x'), 409, ApiErrorCode.CONFLICT],
      [
        new UnprocessableEntityException('x'),
        422,
        ApiErrorCode.UNPROCESSABLE_ENTITY,
      ],
      [
        new HttpException('x', HttpStatus.TOO_MANY_REQUESTS),
        429,
        ApiErrorCode.TOO_MANY_REQUESTS,
      ],
    ])('mapea %# al código de error correcto', (exception, status, code) => {
      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(status);
      expect(getBody().errors).toEqual({ code, statusCode: status });
      expect(getBody().message).toBe('x');
    });

    it('usa INTERNAL_ERROR para status HTTP sin código específico', () => {
      filter.catch(new HttpException('Soy una tetera', 418), host);

      expect(response.status).toHaveBeenCalledWith(418);
      expect(getBody()).toEqual({
        success: false,
        message: 'Soy una tetera',
        data: null,
        errors: {
          code: ApiErrorCode.INTERNAL_ERROR,
          statusCode: 418,
        },
      });
    });

    it('usa el message de una InternalServerErrorException con su status 500', () => {
      filter.catch(new InternalServerErrorException('Falló algo'), host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(getBody().message).toBe('Falló algo');
      expect(getBody().errors.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    });
  });

  // =========================
  // Errores de validación
  // =========================

  describe('errores de validación (message como array)', () => {
    it('devuelve VALIDATION_ERROR con el detalle de cada error', () => {
      filter.catch(
        new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: ['name must be a string', 'email must be an email'],
        }),
        host,
      );

      expect(response.status).toHaveBeenCalledWith(400);
      expect(getBody()).toEqual({
        success: false,
        message: 'Hay errores de validación en los datos enviados',
        data: null,
        errors: {
          code: ApiErrorCode.VALIDATION_ERROR,
          statusCode: 400,
          details: ['name must be a string', 'email must be an email'],
        },
      });
    });

    it('convierte a string los elementos del array', () => {
      filter.catch(
        new BadRequestException({ message: [1, true, 'texto'] }),
        host,
      );

      expect(getBody().errors.details).toEqual(['1', 'true', 'texto']);
    });

    it('trata un array vacío como error de validación con details vacío', () => {
      filter.catch(new BadRequestException({ message: [] }), host);

      expect(getBody().errors.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(getBody().errors.details).toEqual([]);
    });

    it('respeta el status de la excepción aunque el message sea un array', () => {
      filter.catch(
        new UnprocessableEntityException({ message: ['campo inválido'] }),
        host,
      );

      expect(response.status).toHaveBeenCalledWith(422);
      expect(getBody().errors.statusCode).toBe(422);
      expect(getBody().errors.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });
  });

  // =========================
  // HttpException con response string
  // =========================

  describe('HttpException cuyo response es un string', () => {
    it('usa el string como mensaje', () => {
      filter.catch(new HttpException('Mensaje directo', 404), host);

      expect(getBody()).toEqual({
        success: false,
        message: 'Mensaje directo',
        data: null,
        errors: {
          code: ApiErrorCode.NOT_FOUND,
          statusCode: 404,
        },
      });
    });
  });

  // =========================
  // HttpException sin message utilizable → mensaje por defecto
  // =========================

  describe('HttpException sin message utilizable', () => {
    it.each([
      [400, 'La solicitud no es válida', ApiErrorCode.BAD_REQUEST],
      [401, 'No estás autenticado', ApiErrorCode.UNAUTHORIZED],
      [
        403,
        'No tenés permisos para realizar esta operación',
        ApiErrorCode.FORBIDDEN,
      ],
      [404, 'El recurso solicitado no existe', ApiErrorCode.NOT_FOUND],
      [409, 'La operación genera un conflicto', ApiErrorCode.CONFLICT],
      [
        422,
        'La información enviada no puede ser procesada',
        ApiErrorCode.UNPROCESSABLE_ENTITY,
      ],
      [429, 'Demasiadas solicitudes', ApiErrorCode.TOO_MANY_REQUESTS],
      [418, 'Ocurrió un error interno', ApiErrorCode.INTERNAL_ERROR],
    ])(
      'status %i usa el mensaje por defecto cuando el objeto no tiene message',
      (status, defaultMessage, code) => {
        filter.catch(new HttpException({ foo: 'bar' }, status), host);

        expect(response.status).toHaveBeenCalledWith(status);
        expect(getBody()).toEqual({
          success: false,
          message: defaultMessage,
          data: null,
          errors: { code, statusCode: status },
        });
      },
    );

    it('usa el mensaje por defecto si message no es string ni array', () => {
      filter.catch(new HttpException({ message: 123 }, 404), host);

      expect(getBody().message).toBe('El recurso solicitado no existe');
      expect(getBody().errors.code).toBe(ApiErrorCode.NOT_FOUND);
    });

    it('usa el mensaje por defecto si message es null', () => {
      filter.catch(new HttpException({ message: null }, 401), host);

      expect(getBody().message).toBe('No estás autenticado');
    });
  });

  // =========================
  // Errores no controlados
  // =========================

  describe('errores que no son HttpException', () => {
    it('responde 500 con mensaje genérico para un Error común', () => {
      filter.catch(new Error('detalle interno secreto'), host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(getBody()).toEqual({
        success: false,
        message: INTERNAL_MESSAGE,
        data: null,
        errors: {
          code: ApiErrorCode.INTERNAL_ERROR,
          statusCode: 500,
        },
      });
    });

    it('no expone el mensaje del error interno al cliente', () => {
      filter.catch(new Error('password de la base: 1234'), host);

      expect(JSON.stringify(getBody())).not.toContain('password');
    });

    it.each([
      ['un string', 'algo falló'],
      ['null', null],
      ['undefined', undefined],
      ['un objeto cualquiera', { code: 'ECONNREFUSED' }],
    ])('responde 500 cuando se lanza %s', (_label, thrown) => {
      filter.catch(thrown, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(getBody().message).toBe(INTERNAL_MESSAGE);
      expect(getBody().errors.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    });
  });

  // =========================
  // Estructura general
  // =========================

  describe('estructura de la respuesta', () => {
    it('siempre devuelve success false y data null', () => {
      filter.catch(new NotFoundException('x'), host);

      expect(getBody().success).toBe(false);
      expect(getBody().data).toBeNull();
    });

    it('llama a status() antes de json()', () => {
      filter.catch(new NotFoundException('x'), host);

      const statusOrder = response.status.mock.invocationCallOrder[0];
      const jsonOrder = response.json.mock.invocationCallOrder[0];

      expect(statusOrder).toBeLessThan(jsonOrder);
    });
  });
});
