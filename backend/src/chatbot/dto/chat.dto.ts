import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { FAQCategory } from '../data/faq.es';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const FAQ_CATEGORY_VALUES: FAQCategory[] = [
  'general',
  'appointments',
  'payments',
  'professionals',
  'account',
];

// Valida el cuerpo requerido por POST /chatbot/message.
// Comentarios de orientación agregados por dev-Mazz.
export class ChatMessageDto {
  @ApiProperty({
    description: 'Identificador único temporal de la sesión del chat provisto por el cliente (acotado para evitar abusos)',
    maxLength: 100,
    example: 'session_123abc456xyz',
  })
  // Identificador declarado por el cliente. No se valida contra ningún guard
  // de autenticación (el chat es público), así que nunca debe tratarse como
  // una identidad confiable — solo se acota su longitud para evitar abuso.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'userId no debe superar los 100 caracteres' })
  userId!: string;

  // Texto libre que el servicio compara con las keywords del FAQ.
  @ApiProperty({
    description: 'Texto libre enviado por el usuario que el chatbot analizará frente al FAQ',
    maxLength: 500,
    example: '¿Cuáles son los métodos de pago disponibles?',
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(500, { message: 'El mensaje no debe superar los 500 caracteres' })
  text!: string;

  @ApiPropertyOptional({
    description: 'Contexto dinámico complementario para extender o guiar el estado de la conversación',
    example: { currentStep: 'payment_inquiry', attempts: 1 },
  })
  // Contexto opcional reservado para ampliar el flujo conversacional.
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

// Valida el parámetro de ruta en GET /chatbot/category/:category.
export class CategoryParamDto {
  @ApiProperty({
    description: 'Categoría temática del FAQ que se desea consultar',
    enum: FAQ_CATEGORY_VALUES, 
    example: 'appointments',
  })
  @IsEnum(FAQ_CATEGORY_VALUES, {
    message: `category debe ser uno de: ${FAQ_CATEGORY_VALUES.join(', ')}`,
  })
  category!: FAQCategory;
}

// Valida los query params en GET /chatbot/answer.
export class AnswerQueryDto {
  @ApiProperty({
    description: 'Categoría a la que pertenece la pregunta específica',
    enum: FAQ_CATEGORY_VALUES, 
    example: 'payments',
  })
  @IsEnum(FAQ_CATEGORY_VALUES, {
    message: `category debe ser uno de: ${FAQ_CATEGORY_VALUES.join(', ')}`,
  })
  category!: FAQCategory;

  @ApiProperty({
    description: 'Texto exacto o identificador de la pregunta dentro de la categoría seleccionada',
    maxLength: 200,
    example: '¿Puedo pagar con tarjeta de crédito?',
  })
  @IsString()
  @IsNotEmpty({ message: 'question es requerido' })
  @MaxLength(200, { message: 'question no debe superar los 200 caracteres' })
  question!: string;
}
