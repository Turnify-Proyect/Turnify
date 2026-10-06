import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  let interceptor: ApiResponseInterceptor<any>;

  const context = {} as ExecutionContext;

  const DEFAULT_MESSAGE = 'Operación realizada con éxito';

  const run = (value: unknown) => {
    const next: CallHandler = { handle: () => of(value) };

    return lastValueFrom(interceptor.intercept(context, next));
  };

  beforeEach(() => {
    interceptor = new ApiResponseInterceptor();
  });

  it('debería estar definido', () => {
    expect(interceptor).toBeDefined();
  });

  describe('respuestas sin "message"', () => {
    it('envuelve un objeto con el mensaje por defecto', async () => {
      const payload = { id: 1, name: 'Corte' };

      await expect(run(payload)).resolves.toEqual({
        success: true,
        message: DEFAULT_MESSAGE,
        data: payload,
        errors: null,
      });
    });

    it('envuelve un array sin modificarlo', async () => {
      const payload = [{ id: 1 }, { id: 2 }];

      await expect(run(payload)).resolves.toEqual({
        success: true,
        message: DEFAULT_MESSAGE,
        data: payload,
        errors: null,
      });
    });

    it('envuelve un array vacío', async () => {
      const result = await run([]);

      expect(result.data).toEqual([]);
      expect(result.message).toBe(DEFAULT_MESSAGE);
    });

    it('envuelve un string', async () => {
      const result = await run('ok');

      expect(result).toEqual({
        success: true,
        message: DEFAULT_MESSAGE,
        data: 'ok',
        errors: null,
      });
    });

    it('envuelve un número, incluso 0', async () => {
      const result = await run(0);

      expect(result.data).toBe(0);
      expect(result.message).toBe(DEFAULT_MESSAGE);
    });

    it('envuelve un boolean false', async () => {
      const result = await run(false);

      expect(result.data).toBe(false);
      expect(result.message).toBe(DEFAULT_MESSAGE);
    });

    it('devuelve data null cuando el handler devuelve null', async () => {
      await expect(run(null)).resolves.toEqual({
        success: true,
        message: DEFAULT_MESSAGE,
        data: null,
        errors: null,
      });
    });

    it('devuelve data undefined cuando el handler no devuelve nada', async () => {
      const result = await run(undefined);

      expect(result.success).toBe(true);
      expect(result.message).toBe(DEFAULT_MESSAGE);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeNull();
    });
  });

  describe('respuestas con "message"', () => {
    it('usa el message como mensaje y lo quita de data', async () => {
      await expect(
        run({
          message: 'Turno creado correctamente',
          id: 5,
          status: 'PENDING',
        }),
      ).resolves.toEqual({
        success: true,
        message: 'Turno creado correctamente',
        data: { id: 5, status: 'PENDING' },
        errors: null,
      });
    });

    it('devuelve data null si "message" era la única propiedad', async () => {
      await expect(run({ message: 'Turno cancelado' })).resolves.toEqual({
        success: true,
        message: 'Turno cancelado',
        data: null,
        errors: null,
      });
    });

    it('no muta el objeto original', async () => {
      const payload = { message: 'Hola', id: 1 };

      await run(payload);

      expect(payload).toEqual({ message: 'Hola', id: 1 });
    });
  });

  describe('estructura de la respuesta', () => {
    it('siempre incluye success true y errors null', async () => {
      const result = await run({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.errors).toBeNull();
      expect(Object.keys(result).sort()).toEqual(
        ['data', 'errors', 'message', 'success'].sort(),
      );
    });
  });

  describe('errores', () => {
    it('no captura los errores del handler: los deja pasar al filtro de excepciones', async () => {
      const error = new Error('falló el handler');
      const next: CallHandler = { handle: () => throwError(() => error) };

      await expect(
        lastValueFrom(interceptor.intercept(context, next)),
      ).rejects.toBe(error);
    });
  });
});
