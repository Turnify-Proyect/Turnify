import { Injectable } from '@nestjs/common';
import { ALL_FAQ_ENTRIES, FAQ_DATABASE, FAQCategory } from './data/faq.es';

// Representa un mensaje que el frontend puede mostrar en la conversación.
// `type` indica cómo presentarlo y `payload` contiene datos para botones/categorías.
// Comentarios de orientación agregados por dev-Mazz.
export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  type?: 'text' | 'buttons' | 'category';
  payload?: unknown;
}

// Estructura común que devuelven todos los flujos del chatbot.
export interface ChatResponse {
  messages: ChatMessage[];
  suggestedCategories?: FAQCategory[];
}

@Injectable()
export class ChatbotService {
  // Evita coincidencias débiles; una frase específica también puede bastar.
  private readonly MIN_KEYWORD_MATCH = 2;

  // Procesa texto libre y entrega una respuesta FAQ o el menú como alternativa.
  // userId y context se reciben para la integración, pero aún no afectan la búsqueda.
  processMessage(
    userId: string,
    text: string,
    context?: unknown,
  ): ChatResponse {
    void userId;
    void context;

    const normalized = this.normalize(text);
    if (normalized.includes('gracias')) {
      return this.buildCategoryMenu(
        '¡Un placer ayudarte! 😊 ¿En qué más puedo ayudarte?',
      );
    }

    const match = this.findBestMatch(normalized);
    if (match) {
      return this.buildAnswerResponse(match);
    }

    return this.buildCategoryMenu(
      'No encontré una respuesta exacta. ¿Sobre qué tema te gustaría consultar?',
    );
  }

  // Construye el saludo de bienvenida y presenta las categorías disponibles.
  getWelcomeMessage(): ChatResponse {
    return this.buildCategoryMenu(
      '¡Hola! 👋 Soy Lumi, el asistente de Turnify. Estoy aquí para ayudarte. ¿Qué necesitas?',
    );
  }

  // Busca la FAQ más relevante: exige varias keywords o una frase específica.
  private findBestMatch(input: string): {
    entry: (typeof ALL_FAQ_ENTRIES)[number];
    score: number;
  } | null {
    let best: {
      entry: (typeof ALL_FAQ_ENTRIES)[number];
      score: number;
    } | null = null;
    let bestScore = 0;

    for (const entry of ALL_FAQ_ENTRIES) {
      const score = this.keywordScore(input, entry.keywords);
      const hasSpecificPhraseMatch = entry.keywords.some((keyword) => {
        const normalizedKeyword = this.normalize(keyword);
        return (
          normalizedKeyword.includes(' ') && input.includes(normalizedKeyword)
        );
      });

      if (
        score > bestScore &&
        (score >= this.MIN_KEYWORD_MATCH || hasSpecificPhraseMatch)
      ) {
        bestScore = score;
        best = { entry, score };
      }
    }
    return best;
  }

  // Cuenta cuántas keywords de una entrada aparecen en el texto normalizado.
  private keywordScore(input: string, keywords: string[]): number {
    return keywords.filter((k) => input.includes(this.normalize(k))).length;
  }

  // Unifica mayúsculas, tildes y signos para comparar texto de forma consistente.
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:]/g, '')
      .trim();
  }

  // Formatea la respuesta FAQ y agrega botones de seguimiento para el frontend.
  private buildAnswerResponse({
    entry,
  }: {
    entry: (typeof ALL_FAQ_ENTRIES)[number];
  }): ChatResponse {
    return {
      messages: [
        { role: 'bot', content: entry.answer, type: 'text' },
        {
          role: 'bot',
          content: '¿Te sirvió esta respuesta?',
          type: 'buttons',
          payload: { buttons: ['Sí, gracias 👍', 'No, otra pregunta ❓'] },
        },
      ],
    };
  }

  // Convierte el catálogo de categorías en el formato que consume la interfaz.
  private buildCategoryMenu(intro: string): ChatResponse {
    const categories = Object.entries(FAQ_DATABASE).map(([key, cat]) => ({
      id: key as FAQCategory,
      label: cat.label,
      icon: cat.icon,
    }));

    return {
      messages: [
        { role: 'bot', content: intro, type: 'text' },
        {
          role: 'bot',
          content: 'Elige una categoría:',
          type: 'category',
          payload: { categories },
        },
      ],
      suggestedCategories: categories.map((c) => c.id),
    };
  }

  // Devuelve el nombre de la categoría y sus preguntas como botones seleccionables.
  getCategoryContent(category: FAQCategory): ChatResponse {
    const cat = FAQ_DATABASE[category];
    if (!cat) return this.getWelcomeMessage();

    return {
      messages: [
        { role: 'bot', content: `${cat.icon} ${cat.label}`, type: 'text' },
        {
          role: 'bot',
          content: 'Toca una pregunta:',
          type: 'buttons',
          payload: {
            buttons: cat.entries.map((e) => e.question),
            action: 'faq_question',
            category,
          },
        },
        {
          role: 'bot',
          content: '← Volver al menú principal',
          type: 'buttons',
          payload: { buttons: ['Menú principal 🏠'], action: 'main_menu' },
        },
      ],
    };
  }

  // Busca la pregunta dentro de su categoría; si no existe, vuelve a mostrarla.
  getQuestionAnswer(category: FAQCategory, questionText: string): ChatResponse {
    const entry = FAQ_DATABASE[category].entries.find(
      (e) => e.question === questionText,
    );
    if (!entry) return this.getCategoryContent(category);
    return this.buildAnswerResponse({ entry });
  }
}
