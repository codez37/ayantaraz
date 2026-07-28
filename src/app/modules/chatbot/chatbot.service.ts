import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskLevel, UserRole } from '@prisma/client';

const PERSIAN_DIGITS = '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9';
const ARABIC_DIGITS = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669';
const DIACRITICS = /[\\u064B-\\u0652\\u0670]/g;
const PERSIAN_NORMALIZE: Record<string, string> = {
  '\u0643': '\u06a9',
  '\u064a': '\u06cc',
  '\u0629': '\u0647',
  '\u06c0': '\u0647',
  '\u06be': '\u0647',
  '\u064e': '',
  '\u064f': '',
  '\u0650': '',
  '\u064b': '',
  '\u064c': '',
  '\u064d': '',
  '\u0651': '',
  '\u0652': '',
  '\u0653': '',
  '\u0654': '',
  '\u0655': '',
  '\u0670': '',
};

function removeDiacritics(s: string): string {
  return s.replace(DIACRITICS, '');
}

function normalizePersian(s: string): string {
  return s.replace(/[^\\w\\s\\d]/g, (c) => PERSIAN_NORMALIZE[c] ?? c);
}

function extractPersianNumbers(s: string): string {
  const digitMap: Record<string, string> = {};
  for (let i = 0; i < 10; i++) {
    digitMap[PERSIAN_DIGITS[i]] = String(i);
    digitMap[ARABIC_DIGITS[i]] = String(i);
  }
  return s.replace(/[\u06f0-\u06f9\u0660-\u0669]/g, (c) => digitMap[c] ?? c);
}

const HIGH_RISK_KEYWORDS = [
  '\u0641\u0631\u0627\u0631 \u0645\u0627\u0644\u06cc\u0627\u062a\u06cc',
  '\u062f\u0648\u0631 \u0632\u062f\u0646',
  '\u062c\u0639\u0644',
  '\u062a\u062e\u0644\u0641',
  '\u0631\u0627\u0647 \u0641\u0631\u0627\u0631',
  '\u062a\u0642\u0648\u06cc\u0629',
  '\u062a\u062e\u0644\u0641 \u0627\u0642\u0644\u0627\u0645\u06cc',
  '\u062a\u0648\u0627\u0646\u0627\u062a\u06cc',
  '\u0627\u0635\u0644\u0627\u0647 \u0627\u0642\u0644\u0627\u0645\u06cc',
  '\u062f\u0631\u0627\u0648\u0646\u0643\u0627\u0631\u062f',
];

const MEDIUM_RISK_KEYWORDS = [
  '\u0645\u0627\u0644\u06cc\u0627\u062a',
  '\u062f\u0633\u0627\u0628',
  '\u0627\u0632 \u0637\u0642\u0627\u0644\u0627\u062a',
  '\u0627\u0642\u0627\u0645\u062a',
  '\u0628\u0627\u0646\u0643',
  '\u0628\u06cc\u0645\u0647',
  '\u0633\u0628\u062f',
];

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  async processMessage(userId: number, message: string): Promise<{
    response: string;
    riskLevel: RiskLevel;
    confidence: number;
    suggestions?: string[];
  }> {
    // Normalize the message
    const normalizedMessage = this.normalizeMessage(message);

    // Check risk level
    const riskLevel = this.detectRiskLevel(normalizedMessage);

    // Get response from knowledge base
    const knowledgeResponse = await this.getKnowledgeBaseResponse(normalizedMessage);

    if (knowledgeResponse) {
      return {
        response: knowledgeResponse,
        riskLevel,
        confidence: 0.95,
        suggestions: this.getSuggestions(riskLevel, normalizedMessage),
      };
    }

    // Fallback response
    return {
      response: this.getFallbackAnswer(null),
      riskLevel,
      confidence: 0.7,
      suggestions: this.getSuggestions(riskLevel, normalizedMessage),
    };
  }

  private normalizeMessage(message: string): string {
    let normalized = message;
    normalized = removeDiacritics(normalized);
    normalized = normalizePersian(normalized);
    normalized = extractPersianNumbers(normalized);
    return normalized.trim().toLowerCase();
  }

  private detectRiskLevel(message: string): RiskLevel {
    const highRiskMatches = HIGH_RISK_KEYWORDS.filter((keyword) =>
      message.includes(keyword),
    );
    if (highRiskMatches.length > 0) {
      return RiskLevel.forbidden;
    }

    const mediumRiskMatches = MEDIUM_RISK_KEYWORDS.filter((keyword) =>
      message.includes(keyword),
    );
    if (mediumRiskMatches.length > 0) {
      return RiskLevel.high;
    }

    return RiskLevel.low;
  }

  private async getKnowledgeBaseResponse(query: string): Promise<string | null> {
    try {
      const matches = await this.prisma.knowledgeBase.findMany({
        where: {
          OR: [
            { question: { contains: query, mode: 'insensitive' } },
            { answer: { contains: query, mode: 'insensitive' } },
            { keywords: { has: query } },
          ],
        },
        orderBy: { priority: 'desc' },
        take: 5,
      });

      if (matches.length === 0) {
        return null;
      }

      const scored = matches.map((match: any) => ({
        ...match,
        score: this.calculateMatchScore(match, query),
      }));

      scored.sort((a: any, b: any) => b.score - a.score);

      return scored[0].answer;
    } catch (error) {
      return null;
    }
  }

  private calculateMatchScore(item: any, query: string): number {
    let score = 0;

    // Exact match bonus
    if (item.question.toLowerCase() === query) {
      score += 100;
    }

    // Partial match bonus
    if (item.question.toLowerCase().includes(query)) {
      score += 50;
    }

    // Keyword match bonus
    if (item.keywords && item.keywords.some((kw: string) => query.includes(kw))) {
      score += 30;
    }

    // Priority bonus
    score += item.priority * 10;

    return score;
  }

  private getSuggestions(riskLevel: RiskLevel, message: string): string[] {
    const suggestions: string[] = [];

    switch (riskLevel) {
      case RiskLevel.forbidden:
        suggestions.push('\u0644\u0637\u0641\u0638\u0627 \u0628\u0627 \u0648\u06a9\u0644\u0627\u0646 \u0627\u0637\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628 \u062f\u0631 \u0627\u06cc\u0646 \u0627\u0637\u0645\u0627\u0644\u0627\u062a\u06cc');
        break;
      case RiskLevel.high:
        suggestions.push('\u0644\u0637\u0641\u0638\u0627 \u0628\u0627 \u0648\u06a9\u0644\u0627\u0646 \u0627\u0637\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628 \u062f\u0631 \u0627\u06cc\u0646 \u0627\u0637\u0645\u0627\u0644\u062a\u06cc');
        break;
      default:
        suggestions.push('\u0644\u0637\u0641\u0638\u0627 \u0628\u0627 \u0648\u06a9\u0644\u0627\u0646 \u0627\u0637\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628');
    }

    return suggestions;
  }

  private getFallbackAnswer(topic: string | null): string {
    const fallbackResponses = [
      '\u0645\u062a\u0627\u0633\u0641\u0627\u0646\u0647 \u062f\u0631 \u0627\u06cc\u0646\u062c\u0627 \u062f\u0627\u0631\u06cc\u0645\u060c \u062c\u0648\u0627\u0628 \u062f\u0647\u06cc\u062f \u062f\u0631 \u0633\u0627\u0644 \u0627\u0634\u062a\u0631\u0627\u06a9 \u0628\u062f\u0647\u06cc\u0645.',
      '\u062f\u0631 \u062d\u0627\u0644 \u0627\u0633\u062a\u0641\u0627\u062f\u0627 \u0628\u0627 \u0648\u06a9\u0644\u0627\u0646 \u0627\u0637\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628 \u062f\u0631 \u0627\u06cc\u0646\u062c\u0627 \u062c\u0648\u0627\u0628 \u062f\u0647\u06cc\u062f.',
      '\u0627\u0632 \u0627\u06cc\u0646\u062c\u0627 \u062f\u0631 \u0633\u0627\u0644 \u0627\u0634\u062a\u0631\u0627\u06a9 \u062f\u0647\u06cc\u062f \u0628\u0647 \u0648\u06a9\u0644\u0627\u0646 \u0627\u0637\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628 \u062c\u0648\u0627\u0628 \u062f\u0647\u06cc\u062d.',
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}
