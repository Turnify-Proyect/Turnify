import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

// Registra y conecta el controlador HTTP con la lógica del chatbot.
// Comentarios de orientación agregados por dev-Mazz.
@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService],
  // Permite que otros módulos inyecten el servicio si lo necesitan.
  exports: [ChatbotService],
})
export class ChatbotModule {}
