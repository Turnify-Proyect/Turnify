import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import type { ChatResponse } from './chatbot.service';
import type { FAQCategory } from './data/faq.es';
import { ChatMessageDto } from './dto/chat.dto';

describe('ChatbotController', () => {
  let controller: ChatbotController;
  let chatbotService: {
    processMessage: jest.Mock;
    getWelcomeMessage: jest.Mock;
    getCategoryContent: jest.Mock;
    getQuestionAnswer: jest.Mock;
  };

  // La forma exacta de ChatResponse no importa para estos tests:
  // el controller solo devuelve lo que le entrega el service.
  const chatResponse = {
    type: 'text',
    text: 'respuesta',
  } as unknown as ChatResponse;

  // Valor de ejemplo para la categoría; se castea porque FAQCategory es un tipo.
  const category = 'turnos' as unknown as FAQCategory;

  beforeEach(async () => {
    chatbotService = {
      processMessage: jest.fn().mockReturnValue(chatResponse),
      getWelcomeMessage: jest.fn().mockReturnValue(chatResponse),
      getCategoryContent: jest.fn().mockReturnValue(chatResponse),
      getQuestionAnswer: jest.fn().mockReturnValue(chatResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [{ provide: ChatbotService, useValue: chatbotService }],
    }).compile();

    controller = module.get(ChatbotController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  // =========================
  // POST /chatbot/message
  // =========================

  describe('handleMessage', () => {
    it('delega en processMessage con userId, text y context', () => {
      const body = {
        userId: 'user-1',
        text: '¿Cómo reservo un turno?',
        context: { step: 'menu' },
      } as unknown as ChatMessageDto;

      const result = controller.handleMessage(body);

      expect(chatbotService.processMessage).toHaveBeenCalledTimes(1);
      expect(chatbotService.processMessage).toHaveBeenCalledWith(
        'user-1',
        '¿Cómo reservo un turno?',
        { step: 'menu' },
      );
      expect(result).toBe(chatResponse);
    });

    it('funciona cuando no se envía context', () => {
      const body = {
        userId: 'user-1',
        text: 'hola',
      } as unknown as ChatMessageDto;

      controller.handleMessage(body);

      expect(chatbotService.processMessage).toHaveBeenCalledWith(
        'user-1',
        'hola',
        undefined,
      );
    });

    it('propaga los errores del service', () => {
      chatbotService.processMessage.mockImplementation(() => {
        throw new Error('falló el chatbot');
      });

      expect(() =>
        controller.handleMessage({
          userId: 'user-1',
          text: 'hola',
        } as unknown as ChatMessageDto),
      ).toThrow('falló el chatbot');
    });
  });

  // =========================
  // GET /chatbot/welcome
  // =========================

  describe('welcome', () => {
    it('devuelve el mensaje de bienvenida del service', () => {
      const result = controller.welcome();

      expect(chatbotService.getWelcomeMessage).toHaveBeenCalledTimes(1);
      expect(chatbotService.getWelcomeMessage).toHaveBeenCalledWith();
      expect(result).toBe(chatResponse);
    });
  });

  // =========================
  // GET /chatbot/category/:category
  // =========================

  describe('category', () => {
    it('delega en getCategoryContent con la categoría de la URL', () => {
      const result = controller.category(category);

      expect(chatbotService.getCategoryContent).toHaveBeenCalledTimes(1);
      expect(chatbotService.getCategoryContent).toHaveBeenCalledWith(category);
      expect(result).toBe(chatResponse);
    });
  });

  // =========================
  // GET /chatbot/answer
  // =========================

  describe('answer', () => {
    it('delega en getQuestionAnswer con category y question', () => {
      const result = controller.answer(category, 'q1');

      expect(chatbotService.getQuestionAnswer).toHaveBeenCalledTimes(1);
      expect(chatbotService.getQuestionAnswer).toHaveBeenCalledWith(
        category,
        'q1',
      );
      expect(result).toBe(chatResponse);
    });

    it('pasa los valores tal como llegan, aunque falten', () => {
      controller.answer(
        undefined as unknown as FAQCategory,
        undefined as unknown as string,
      );

      expect(chatbotService.getQuestionAnswer).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  // =========================
  // Metadata de las rutas
  // =========================

  describe('metadata de las rutas', () => {
    const proto = ChatbotController.prototype;

    it('el controlador está montado en /chatbot', () => {
      expect(Reflect.getMetadata(PATH_METADATA, ChatbotController)).toBe(
        'chatbot',
      );
    });

    it.each([
      ['handleMessage', 'message', RequestMethod.POST],
      ['welcome', 'welcome', RequestMethod.GET],
      ['category', 'category/:category', RequestMethod.GET],
      ['answer', 'answer', RequestMethod.GET],
    ] as const)(
      '%s responde a la ruta y el método HTTP esperados',
      (handlerName, path, method) => {
        const handler = proto[handlerName];

        expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
        expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
      },
    );

    it('los endpoints son públicos (sin guards)', () => {
      const handlers = [
        proto.handleMessage,
        proto.welcome,
        proto.category,
        proto.answer,
      ];

      for (const handler of handlers) {
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toBeUndefined();
      }

      expect(
        Reflect.getMetadata(GUARDS_METADATA, ChatbotController),
      ).toBeUndefined();
    });
  });
});
