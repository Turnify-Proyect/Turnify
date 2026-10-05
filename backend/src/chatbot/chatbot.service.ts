import { Injectable } from '@nestjs/common';
import { ALL_FAQ_ENTRIES, FAQ_DATABASE, FAQCategory } from './data/faq.es';

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  type?: 'text' | 'buttons' | 'category';
  payload?: unknown; // botones, categorías, etc.
}

export interface ChatResponse {
  messages: ChatMessage[];
  suggestedCategories?: FAQCategory[];
}

@Injectable()
export class ChatbotService {
  private readonly MIN_KEYWORD_MATCH = 2; // mínimo keywords para considerar match

  // Punto de entrada principal
  processMessage(
    userId: string,
    text: string,
    context?: unknown,
  ): ChatResponse {
    void userId;
    void context;

    const normalized = this.normalize(text);

    // 1. Intento match por palabras clave
    const match = this.findBestMatch(normalized);
    if (match) {
      return this.buildAnswerResponse(match);
    }

    // 2. No match → muestro categorías principales
    return this.buildCategoryMenu(
      'No encontré una respuesta exacta. ¿Sobre qué tema te gustaría consultar?',
    );
  }

  // Menú inicial / fallback
  getWelcomeMessage(): ChatResponse {
    return this.buildCategoryMenu(
      '¡Hola! 👋 Soy el asistente de Turnify. ¿En qué puedo ayudarte hoy?',
    );
  }

  // ---- Lógica interna ----

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
      if (score > bestScore && score >= this.MIN_KEYWORD_MATCH) {
        bestScore = score;
        best = { entry, score };
      }
    }
    return best;
  }

  private keywordScore(input: string, keywords: string[]): number {
    return keywords.filter((k) => input.includes(this.normalize(k))).length;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[¿?¡!.,;:]/g, '')
      .trim();
  }

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

  // Cuando usuario elige una categoría (via botón)
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

  // Cuando usuario elige una pregunta específica
  getQuestionAnswer(category: FAQCategory, questionText: string): ChatResponse {
    const entry = FAQ_DATABASE[category].entries.find(
      (e) => e.question === questionText,
    );
    if (!entry) return this.getCategoryContent(category);
    return this.buildAnswerResponse({ entry });
  }
}
