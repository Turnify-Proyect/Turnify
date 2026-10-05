import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import type { ChatResponse } from './chatbot.service';
import type { FAQCategory } from './data/faq.es';
import { ChatMessageDto } from './dto/chat.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post('message')
  handleMessage(@Body() body: ChatMessageDto): ChatResponse {
    return this.chatbot.processMessage(body.userId, body.text, body.context);
  }

  @Get('welcome')
  welcome(): ChatResponse {
    return this.chatbot.getWelcomeMessage();
  }

  @Get('category/:category')
  category(@Param('category') category: FAQCategory): ChatResponse {
    return this.chatbot.getCategoryContent(category);
  }

  @Get('answer')
  answer(
    @Query('category') category: FAQCategory,
    @Query('question') question: string,
  ): ChatResponse {
    return this.chatbot.getQuestionAnswer(category, question);
  }
}
