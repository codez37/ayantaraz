import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskLevel } from '@prisma/client';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';

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
  '\u0627\u0632 \u0637\u0631\u0642\u0627\u0644\u0627\u062a',
  '\u0627\u0642\u0627\u0645\u062a',
  '\u0628\u0627\u0646\u0643',
  '\u0628\u06cc\u0645\u0647',
  '\u0633\u0628\u062f',
];

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  async query(question: string, userId?: number): Promise<{
    response: string;
    riskLevel: RiskLevel;
    confidence: number;
    suggestions?: string[];
    sessionId?: string;
  }> {
    const result = await this.processMessage(userId ?? 0, question);
    return result;
  }

  async getConversation(sessionId: string, userId: number, _role: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        sessionId,
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return {
      sessionId,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async getKnowledgeBase(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        orderBy: { priority: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.knowledgeBase.count(),
    ]);
    return { items, total, page, limit };
  }

  async createKnowledgeEntry(dto: CreateKnowledgeDto, _userId: number) {
    return this.prisma.knowledgeBase.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category ?? '',
        riskLevel: dto.riskLevel ?? RiskLevel.low,
        keywords: [],
        priority: 0,
      },
    });
  }

  async updateKnowledgeEntry(id: number, dto: UpdateKnowledgeDto, _userId: number) {
    return this.prisma.knowledgeBase.update({
      where: { id },
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        riskLevel: dto.riskLevel,
      },
    });
  }

  async processMessage(userId: number, message: string): Promise<{
    response: string;
    riskLevel: RiskLevel;
    confidence: number;
    suggestions?: string[];
    sessionId?: string;
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
        suggestions.push('\u0644\u0637\u0641\u0627\u064b \u0628\u0627 \u0648\u06a9\u06cc\u0644 \u0627\u0639\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628 \u062f\u0631 \u0627\u06cc\u0646 \u0627\u0645\u0648\u0631 \u062a\u062f\u0627\u0648\u0644 \u06a9\u0646\u06cc\u062f');
        break;
      case RiskLevel.high:
        suggestions.push('\u0644\u0637\u0641\u0627\u064b \u0628\u0627 \u0648\u06a9\u06cc\u0644 \u0627\u0639\u062a\u0628\u0627\u0631 \u0645\u0646\u0627\u0633\u0628 \u062f\u0631 \u0627\u06cc\u0646 \u0627\u0645\u0648\u0631 \u062a\u062f\u0627\u0648\u0644 \u06a9\u0646\u06cc\u062f');
        break;
      default:
        suggestions.push('\u0644\u0637\u0641\u0627\u064b \u0633\u0626\u0648\u0627\u0644 \u062e\u0648\u062f \u0631\u0627 \u0631\u0648\u0634\u0646\u200c\u062a\u0631 \u0628\u067e\u0631\u0633\u06cc\u062f');
    }

    return suggestions;
  }

  private getFallbackAnswer(topic: string | null): string {
    const fallbackResponses = [
      '\u0645\u062a\u0627\u0633\u0641\u0627\u0646\u0647 \u062f\u0631 \u0627\u06cc\u0646\u0628\u0627\u0631\u0647 \u0628\u0647 \u0633\u0626\u0648\u0627\u0644 \u0634\u0645\u0627 \u067e\u0627\u0633\u062e \u062f\u0642\u06cc\u0642\u06cc \u0646\u062f\u0627\u0631\u0645. \u0644\u0637\u0641\u0627\u064b \u0628\u0627 \u0648\u06a9\u06cc\u0644 \u0627\u0639\u062a\u0628\u0627\u0631 \u06cc\u0627 \u0645\u0634\u0627\u0648\u0631 \u062a\u0645\u0627\u0633 \u0628\u06af\u06cc\u0631\u06cc\u062f.',
      '\u0628\u0647\u0632\u0648\u062f\u06cc \u0627\u0632 \u0633\u0626\u0648\u0627\u0644 \u0634\u0645\u0627 \u0645\u062a\u0648\u062c\u0647 \u0634\u062f\u0645. \u0627\u06af\u0631 \u0633\u0626\u0648\u0627\u0644 \u0645\u0627\u0644\u06cc \u062f\u0627\u0631\u06cc\u062f\u060c \u0628\u0647 \u0635\u0648\u0631\u062a \u062f\u0642\u06cc\u0642\u200c\u062a\u0631 \u0628\u067e\u0631\u0633\u06cc\u062f.',
      '\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0628\u06cc\u0634\u062a\u0631\u06cc \u0644\u0627\u0632\u0645 \u0645\u06cc\u200c\u0628\u0627\u0634\u062f \u062a\u0627 \u0628\u0647 \u0633\u0626\u0648\u0627\u0644 \u0634\u0645\u0627 \u067e\u0627\u0633\u062e \u062f\u0647\u06cc\u062f. \u0644\u0637\u0641\u0627\u064b \u0633\u0626\u0648\u0627\u0644 \u0631\u0627 \u0628\u0627 \u062c\u0632\u0626\u06cc\u0627\u062a \u0628\u06cc\u0634\u062a\u0631 \u0628\u067e\u0631\u0633\u06cc\u062f.',
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}
