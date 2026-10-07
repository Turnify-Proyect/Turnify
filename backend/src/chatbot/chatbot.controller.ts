import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import type { ChatResponse } from './chatbot.service';
import {
  AnswerQueryDto,
  CategoryParamDto,
  ChatMessageDto,
} from './dto/chat.dto';

// Expone los endpoints HTTP que el frontend usa para conversar con el chatbot.
// Comentarios de orientación agregados por dev-Mazz.
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  // POST /chatbot/message: busca una respuesta a partir del texto enviado.
  @Post('message')
  handleMessage(@Body() body: ChatMessageDto): ChatResponse {
    return this.chatbot.processMessage(body.userId, body.text, body.context);
  }

  // GET /chatbot/welcome: devuelve el saludo inicial y el menú de categorías.
  @Get('welcome')
  welcome(): ChatResponse {
    return this.chatbot.getWelcomeMessage();
  }

  // GET /chatbot/category/:category: devuelve las preguntas de una categoría.
  @Get('category/:category')
  category(@Param() params: CategoryParamDto): ChatResponse {
    return this.chatbot.getCategoryContent(params.category);
  }

  // GET /chatbot/answer?category=...&question=...: responde una pregunta del FAQ.
  @Get('answer')
  answer(@Query() query: AnswerQueryDto): ChatResponse {
    return this.chatbot.getQuestionAnswer(query.category, query.question);
  }
}
