import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

describe('ChatbotController', () => {
let controller: ChatbotController;

const chatbotService = {
processMessage: jest.fn(),
getWelcomeMessage: jest.fn(),
getCategoryContent: jest.fn(),
getQuestionAnswer: jest.fn(),
};

beforeEach(async () => {
jest.clearAllMocks();

const module: TestingModule = await Test.createTestingModule({
  controllers: [ChatbotController],
  providers: [
    {
      provide: ChatbotService,
      useValue: chatbotService,
    },
  ],
}).compile();

controller = module.get<ChatbotController>(ChatbotController);


});

describe('handleMessage', () => {
it('delega en processMessage con userId, text y context', () => {
const body = {
userId: 'user-123',
text: '¿Cómo saco un turno?',
context: {
source: 'web',
},
};

  const chatResponse = {
    messages: [
      {
        role: 'bot',
        content: 'Respuesta',
        type: 'text',
      },
    ],
  };

  chatbotService.processMessage.mockReturnValue(chatResponse);

  const result = controller.handleMessage(body);

  expect(chatbotService.processMessage).toHaveBeenCalledTimes(1);
  expect(chatbotService.processMessage).toHaveBeenCalledWith(
    body.userId,
    body.text,
    body.context,
  );
  expect(result).toBe(chatResponse);
});

it('permite context indefinido', () => {
  const body = {
    userId: 'user-123',
    text: 'Hola',
  };

  const chatResponse = {
    messages: [],
  };

  chatbotService.processMessage.mockReturnValue(chatResponse);

  const result = controller.handleMessage(body);

  expect(chatbotService.processMessage).toHaveBeenCalledWith(
    body.userId,
    body.text,
    undefined,
  );
  expect(result).toBe(chatResponse);
});


});

describe('welcome', () => {
it('delega en getWelcomeMessage', () => {
const chatResponse = {
messages: [
{
role: 'bot',
content: 'Bienvenido',
type: 'text',
},
],
};

  chatbotService.getWelcomeMessage.mockReturnValue(chatResponse);

  const result = controller.welcome();

  expect(chatbotService.getWelcomeMessage).toHaveBeenCalledTimes(1);
  expect(result).toBe(chatResponse);
});


});

describe('category', () => {
it('delega en getCategoryContent con la categoría de la URL', () => {
const category = 'turnos';

  const chatResponse = {
    messages: [
      {
        role: 'bot',
        content: 'Turnos',
        type: 'text',
      },
    ],
  };

  chatbotService.getCategoryContent.mockReturnValue(chatResponse);

  const result = controller.category({
    category,
  } as any);

  expect(chatbotService.getCategoryContent).toHaveBeenCalledTimes(1);
  expect(chatbotService.getCategoryContent).toHaveBeenCalledWith(
    category,
  );
  expect(result).toBe(chatResponse);
});

it('pasa undefined si la categoría no está presente', () => {
  const chatResponse = {
    messages: [],
  };

  chatbotService.getCategoryContent.mockReturnValue(chatResponse);

  const result = controller.category({
    category: undefined,
  } as any);

  expect(chatbotService.getCategoryContent).toHaveBeenCalledWith(
    undefined,
  );
  expect(result).toBe(chatResponse);
});


});

describe('answer', () => {
it('delega en getQuestionAnswer con category y question', () => {
const category = 'turnos';
const question = 'q1';

  const chatResponse = {
    messages: [
      {
        role: 'bot',
        content: 'Respuesta',
        type: 'text',
      },
    ],
  };

  chatbotService.getQuestionAnswer.mockReturnValue(chatResponse);

  const result = controller.answer({
    category,
    question,
  } as any);

  expect(chatbotService.getQuestionAnswer).toHaveBeenCalledTimes(1);
  expect(chatbotService.getQuestionAnswer).toHaveBeenCalledWith(
    category,
    question,
  );
  expect(result).toBe(chatResponse);
});

it('pasa los valores tal como llegan, aunque falten', () => {
  const chatResponse = {
    messages: [],
  };

  chatbotService.getQuestionAnswer.mockReturnValue(chatResponse);

  const result = controller.answer({
    category: undefined,
    question: undefined,
  } as any);

  expect(chatbotService.getQuestionAnswer).toHaveBeenCalledTimes(1);
  expect(chatbotService.getQuestionAnswer).toHaveBeenCalledWith(
    undefined,
    undefined,
  );
  expect(result).toBe(chatResponse);
});


});
});