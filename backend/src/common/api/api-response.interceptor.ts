import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './api-response.interface';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T): ApiResponse<T> => {
        // 1. Detectamos si la respuesta trae un mensaje personalizado
        const hasMessage =
          data && typeof data === 'object' && 'message' in data;
        const customMessage = hasMessage
          ? (data as any).message
          : 'Operación realizada con éxito';

        // 2. Si tenía un 'message', limpiamos la data para evitar duplicidad
        let finalData: any = data;
        if (hasMessage) {
          const { message, ...rest } = data as any;
          finalData = Object.keys(rest).length > 0 ? rest : null;
        }

        // 3. Devolvemos la estructura forzando el tipo ApiResponse<T> para TypeScript
        return {
          success: true,
          message: customMessage,
          data: finalData as T,
          errors: null,
        };
      }),
    );
  }
}
