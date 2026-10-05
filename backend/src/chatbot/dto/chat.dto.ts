import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

// Valida el cuerpo requerido por POST /chatbot/message.
// Comentarios de orientación agregados por dev-Mazz.
export class ChatMessageDto {
  // Identificador del usuario que envía el mensaje.
  @IsString()
  @IsNotEmpty()
  userId!: string;

  // Texto libre que el servicio compara con las keywords del FAQ.
  @IsString()
  @IsNotEmpty()
  text!: string;

  // Contexto opcional reservado para ampliar el flujo conversacional.
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
