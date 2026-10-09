import { Injectable } from '@nestjs/common';
import { ALL_FAQ_ENTRIES, FAQ_DATABASE, FAQCategory } from './data/faq.es';

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  type?: 'text' | 'buttons' | 'category';
  payload?: unknown;
}

export interface ChatResponse {
  messages: ChatMessage[];
  suggestedCategories?: FAQCategory[];
}

@Injectable()
export class ChatbotService {
  private readonly MIN_KEYWORD_MATCH = 2;

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

  getWelcomeMessage(): ChatResponse {
    return this.buildCategoryMenu(
      '¡Hola! 👋 Soy Lumi, el asistente de Turnify. Estoy aquí para ayudarte. ¿Qué necesitas?',
    );
  }

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

  private keywordScore(input: string, keywords: string[]): number {
    return keywords.filter((k) => input.includes(this.normalize(k))).length;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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

  getQuestionAnswer(category: FAQCategory, questionText: string): ChatResponse {
    const entry = FAQ_DATABASE[category].entries.find(
      (e) => e.question === questionText,
    );
    if (!entry) return this.getCategoryContent(category);
    return this.buildAnswerResponse({ entry });
  }
}
