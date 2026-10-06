import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { FAQCategory } from '../data/faq.es';

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
  // Identificador declarado por el cliente. No se valida contra ningún guard
  // de autenticación (el chat es público), así que nunca debe tratarse como
  // una identidad confiable — solo se acota su longitud para evitar abuso.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'userId no debe superar los 100 caracteres' })
  userId!: string;

  // Texto libre que el servicio compara con las keywords del FAQ.
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(500, { message: 'El mensaje no debe superar los 500 caracteres' })
  text!: string;

  // Contexto opcional reservado para ampliar el flujo conversacional.
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

// Valida el parámetro de ruta en GET /chatbot/category/:category.
export class CategoryParamDto {
  @IsEnum(FAQ_CATEGORY_VALUES, {
    message: `category debe ser uno de: ${FAQ_CATEGORY_VALUES.join(', ')}`,
  })
  category!: FAQCategory;
}

// Valida los query params en GET /chatbot/answer.
export class AnswerQueryDto {
  @IsEnum(FAQ_CATEGORY_VALUES, {
    message: `category debe ser uno de: ${FAQ_CATEGORY_VALUES.join(', ')}`,
  })
  category!: FAQCategory;

  @IsString()
  @IsNotEmpty({ message: 'question es requerido' })
  @MaxLength(200, { message: 'question no debe superar los 200 caracteres' })
  question!: string;
}
