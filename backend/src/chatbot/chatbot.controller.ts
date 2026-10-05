import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import type { ChatResponse } from './chatbot.service';
import type { FAQCategory } from './data/faq.es';
import { ChatMessageDto } from './dto/chat.dto';

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
  category(@Param('category') category: FAQCategory): ChatResponse {
    return this.chatbot.getCategoryContent(category);
  }

  // GET /chatbot/answer?category=...&question=...: responde una pregunta del FAQ.
  @Get('answer')
  answer(
    @Query('category') category: FAQCategory,
    @Query('question') question: string,
  ): ChatResponse {
    return this.chatbot.getQuestionAnswer(category, question);
  }
}
