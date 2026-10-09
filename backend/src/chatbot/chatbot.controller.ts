import { Body, Controller, Get, Param, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import type { ChatResponse } from './chatbot.service';
import {
  AnswerQueryDto,
  CategoryParamDto,
  ChatMessageDto,
} from './dto/chat.dto';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

// Expone los endpoints HTTP que el frontend usa para conversar con el chatbot.
// Comentarios de orientación agregados por dev-Mazz.
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  // POST /chatbot/message: busca una respuesta a partir del texto enviado.
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar un mensaje al chatbot y obtener una respuesta automática',
    description: 'Procesa el texto enviado por el usuario, normaliza las palabras clave e intenta hacer un match con las respuestas preconfiguradas. Devuelve un mensaje de texto plano o una estructura con menús de categorías si no hay coincidencia exacta.'
  })
  @ApiResponse({ status: 200, description: 'Mensaje procesado correctamente por el motor de intenciones del chatbot.', })
  @ApiResponse({ status: 400, description: 'Petición inválida: El payload enviado no cumple con las reglas del ChatMessageDto (falta el userId o el campo text está vacío).'})
  @ApiResponse({ status: 500, description: 'Error interno del servidor al procesar las reglas algorítmicas de normalización de texto.' })
  handleMessage(@Body() body: ChatMessageDto): ChatResponse {
    return this.chatbot.processMessage(body.userId, body.text, body.context);
  }

  // GET /chatbot/welcome: devuelve el saludo inicial y el menú de categorías.
  @Get('welcome')
  @ApiOperation({
    summary: 'Obtener el mensaje de bienvenida inicial del chatbot',
    description: 'Retorna el saludo de apertura del asistente virtual junto con el menú principal de categorías temáticas para guiar al usuario desde el inicio de la interacción. No requiere autenticación.'
  })
  @ApiResponse({ status: 200, description: 'Mensaje de bienvenida y estructura de opciones cargados con éxito.', })
  @ApiResponse({ status: 500, description: 'Error interno del servidor al construir la estructura del mensaje.' })
  welcome(): ChatResponse {
    return this.chatbot.getWelcomeMessage();
  }

  // GET /chatbot/category/:category: devuelve las preguntas de una categoría.
  @Get('category/:category')
  @ApiParam({
    name: 'category',
    required: true,
    type: String,
    description: 'Nombre de la categoría temática a consultar',
    enum: ['general', 'appointments', 'payments', 'professionals', 'account'], 
    example: 'appointments'
  })
  @ApiOperation({
    summary: 'Obtener el listado de preguntas de una categoría específica',
    description: 'Devuelve un menú estructurado con todas las preguntas disponibles para la categoría solicitada por parámetro de ruta. Si la categoría no es válida o está vacía, devuelve el menú principal por defecto.'
  })
  @ApiResponse({ status: 200, description: 'Estructura de mensajes y botones interactivos generada con éxito.', })
  @ApiResponse({ status: 400, description: 'Petición inválida: El parámetro de ruta no pertenece al catálogo de categorías permitidas del sistema.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor al procesar el mapeo del listado estático.' })
  category(@Param() params: CategoryParamDto): ChatResponse {
    return this.chatbot.getCategoryContent(params.category);
  }

  // GET /chatbot/answer?category=...&question=...: responde una pregunta del FAQ.
  @Get('answer')
  @ApiOperation({
    summary: 'Obtener la respuesta a una pregunta frecuente específica',
    description: 'Devuelve la respuesta detallada en formato estructurado para una combinación de categoría y pregunta enviada por query params. Si la pregunta no se encuentra, devuelve el menú de la categoría como método de contingencia.'
  })
  @ApiQuery({
    name: 'category',
    required: true,
    type: String,
    description: 'Categoría a la que pertenece la pregunta',
    enum: ['general', 'appointments', 'payments', 'professionals', 'account'], 
    example: 'payments'
  })
  @ApiQuery({
    name: 'question',
    required: true,
    type: String,
    description: 'Texto exacto de la pregunta frecuente seleccionada',
    example: '¿Puedo pagar con tarjeta de crédito?'
  })
  @ApiResponse({ status: 200, description: 'Respuesta de la pregunta frecuente encontrada y devuelta con éxito junto con sus botones de navegación.',})
  @ApiResponse({ status: 400, description: 'Petición inválida: La categoría no pertenece al enum permitido o el parámetro de la pregunta está vacío o excede los 200 caracteres.'})
  @ApiResponse({ status: 500, description: 'Error interno del servidor al procesar la búsqueda en la estructura estática de datos.'})
  answer(@Query() query: AnswerQueryDto): ChatResponse {
    return this.chatbot.getQuestionAnswer(query.category, query.question);
  }
}
