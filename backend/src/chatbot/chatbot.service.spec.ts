import { ChatbotService } from './chatbot.service';
import type { FAQCategory } from './data/faq.es';

jest.mock('./data/faq.es', () => {
  const FAQ_DATABASE = {
    turnos: {
      label: 'Turnos',
      icon: '📅',
      entries: [
        {
          question: '¿Cómo reservo un turno?',
          answer: 'Entrá a Reservar y elegí profesional, servicio y horario.',
          keywords: ['reservar', 'turno', 'agendar'],
        },
        {
          question: '¿Cómo cancelo un turno?',
          answer: 'Desde Mis turnos podés cancelar hasta antes de la hora.',
          keywords: ['cancelar', 'turno', 'anular'],
        },
      ],
    },
    pagos: {
      label: 'Pagos',
      icon: '💳',
      entries: [
        {
          question: '¿Cómo pago la seña?',
          answer: 'Podés pagar la seña con tarjeta desde la reserva.',
          keywords: ['pagar', 'seña', 'tarjeta'],
        },
      ],
    },
  };

  const ALL_FAQ_ENTRIES = Object.values(FAQ_DATABASE).flatMap(
    (category) => category.entries,
  );

  return { FAQ_DATABASE, ALL_FAQ_ENTRIES };
});

describe('ChatbotService', () => {
  let service: ChatbotService;

  const turnos = 'turnos' as unknown as FAQCategory;
  const pagos = 'pagos' as unknown as FAQCategory;

  const FALLBACK_INTRO =
    'No encontré una respuesta exacta. ¿Sobre qué tema te gustaría consultar?';

  beforeEach(() => {
    service = new ChatbotService();
  });

  describe('processMessage', () => {
    it('responde con la FAQ cuando coinciden al menos 2 palabras clave', () => {
      const result = service.processMessage(
        'user-1',
        'Quiero reservar un turno',
      );

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({
        role: 'bot',
        content: 'Entrá a Reservar y elegí profesional, servicio y horario.',
        type: 'text',
      });
      expect(result.messages[1]).toEqual({
        role: 'bot',
        content: '¿Te sirvió esta respuesta?',
        type: 'buttons',
        payload: { buttons: ['Sí, gracias 👍', 'No, otra pregunta ❓'] },
      });
    });

    it('la respuesta de FAQ no incluye categorías sugeridas', () => {
      const result = service.processMessage('user-1', 'quiero reservar turno');

      expect(result.suggestedCategories).toBeUndefined();
    });

    it('con una sola palabra clave coincidente devuelve el menú de categorías', () => {
      const result = service.processMessage('user-1', 'turno');

      expect(result.messages[0].content).toBe(FALLBACK_INTRO);
      expect(result.messages[1].type).toBe('category');
      expect(result.suggestedCategories).toEqual([turnos, pagos]);
    });

    it('sin coincidencias devuelve el menú de categorías', () => {
      const result = service.processMessage('user-1', 'hola, ¿qué tal?');

      expect(result.messages[0].content).toBe(FALLBACK_INTRO);
      expect(result.suggestedCategories).toEqual([turnos, pagos]);
    });

    it('con texto vacío devuelve el menú de categorías', () => {
      const result = service.processMessage('user-1', '');

      expect(result.messages[0].content).toBe(FALLBACK_INTRO);
    });

    it('con solo signos de puntuación devuelve el menú de categorías', () => {
      const result = service.processMessage('user-1', '¿¿??!!..');

      expect(result.messages[0].content).toBe(FALLBACK_INTRO);
    });

    it('ignora mayúsculas y signos de puntuación', () => {
      const result = service.processMessage(
        'user-1',
        '¡¿CÓMO RESERVAR UN TURNO?!',
      );

      expect(result.messages[0].content).toBe(
        'Entrá a Reservar y elegí profesional, servicio y horario.',
      );
    });

    it('ignora tildes y la ñ al comparar', () => {
      const result = service.processMessage('user-1', 'quiero pagar la sena');

      expect(result.messages[0].content).toBe(
        'Podés pagar la seña con tarjeta desde la reserva.',
      );
    });

    it('elige la FAQ con más palabras clave coincidentes', () => {
      const result = service.processMessage(
        'user-1',
        'quiero cancelar y anular mi turno',
      );

      expect(result.messages[0].content).toBe(
        'Desde Mis turnos podés cancelar hasta antes de la hora.',
      );
    });

    it('en caso de empate se queda con la primera FAQ del catálogo', () => {
      const result = service.processMessage(
        'user-1',
        'reservar cancelar turno',
      );

      expect(result.messages[0].content).toBe(
        'Entrá a Reservar y elegí profesional, servicio y horario.',
      );
    });

    it('userId y context no modifican el resultado', () => {
      const first = service.processMessage('user-1', 'reservar turno');
      const second = service.processMessage('user-2', 'reservar turno', {
        step: 'menu',
      });

      expect(second).toEqual(first);
    });
  });

  describe('getWelcomeMessage', () => {
    it('devuelve el saludo y el menú de categorías', () => {
      const result = service.getWelcomeMessage();

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('bot');
      expect(result.messages[0].type).toBe('text');
      expect(result.messages[0].content).toContain('Lumi');
      expect(result.messages[1]).toEqual({
        role: 'bot',
        content: 'Elige una categoría:',
        type: 'category',
        payload: {
          categories: [
            { id: 'turnos', label: 'Turnos', icon: '📅' },
            { id: 'pagos', label: 'Pagos', icon: '💳' },
          ],
        },
      });
    });

    it('sugiere todas las categorías existentes', () => {
      const result = service.getWelcomeMessage();

      expect(result.suggestedCategories).toEqual([turnos, pagos]);
    });
  });

  describe('getCategoryContent', () => {
    it('muestra la categoría, sus preguntas y el botón de volver al menú', () => {
      const result = service.getCategoryContent(turnos);

      expect(result.messages).toEqual([
        { role: 'bot', content: '📅 Turnos', type: 'text' },
        {
          role: 'bot',
          content: 'Toca una pregunta:',
          type: 'buttons',
          payload: {
            buttons: ['¿Cómo reservo un turno?', '¿Cómo cancelo un turno?'],
            action: 'faq_question',
            category: turnos,
          },
        },
        {
          role: 'bot',
          content: '← Volver al menú principal',
          type: 'buttons',
          payload: { buttons: ['Menú principal 🏠'], action: 'main_menu' },
        },
      ]);
    });

    it('lista solo las preguntas de la categoría pedida', () => {
      const result = service.getCategoryContent(pagos);

      const payload = result.messages[1].payload as { buttons: string[] };

      expect(payload.buttons).toEqual(['¿Cómo pago la seña?']);
    });

    it('si la categoría no existe devuelve el mensaje de bienvenida', () => {
      const result = service.getCategoryContent(
        'inexistente' as unknown as FAQCategory,
      );

      expect(result).toEqual(service.getWelcomeMessage());
    });
  });

  describe('getQuestionAnswer', () => {
    it('devuelve la respuesta cuando la pregunta existe en la categoría', () => {
      const result = service.getQuestionAnswer(
        turnos,
        '¿Cómo cancelo un turno?',
      );

      expect(result.messages[0]).toEqual({
        role: 'bot',
        content: 'Desde Mis turnos podés cancelar hasta antes de la hora.',
        type: 'text',
      });
      expect(result.messages[1].type).toBe('buttons');
    });

    it('si la pregunta no existe vuelve a mostrar la categoría', () => {
      const result = service.getQuestionAnswer(turnos, 'pregunta inventada');

      expect(result).toEqual(service.getCategoryContent(turnos));
    });

    it('la comparación de la pregunta es exacta (distingue mayúsculas)', () => {
      const result = service.getQuestionAnswer(
        turnos,
        '¿cómo reservo un turno?',
      );

      expect(result).toEqual(service.getCategoryContent(turnos));
    });

    it('no encuentra una pregunta que pertenece a otra categoría', () => {
      const result = service.getQuestionAnswer(
        pagos,
        '¿Cómo reservo un turno?',
      );

      expect(result).toEqual(service.getCategoryContent(pagos));
    });

    it('lanza TypeError si la categoría no existe', () => {
      expect(() =>
        service.getQuestionAnswer(
          'inexistente' as unknown as FAQCategory,
          '¿Cómo reservo un turno?',
        ),
      ).toThrow(TypeError);
    });
  });
});
