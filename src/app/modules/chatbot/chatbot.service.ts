import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskLevel } from '@prisma/client';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const DIACRITICS = /[\u064B-\u0652\u0670]/g;
const PERSIAN_NORMALIZE: Record<string, string> = {
  ك: 'ک',
  ي: 'ی',
  ة: 'ه',
  ۀ: 'ه',
  ھ: 'ه',
  'َ': '',
  'ُ': '',
  'ِ': '',
  'ً': '',
  'ٌ': '',
  'ٍ': '',
  'ّ': '',
  'ْ': '',
  'ٓ': '',
  'ٔ': '',
  'ٕ': '',
  'ٰ': '',
};

function removeDiacritics(s: string): string {
  return s.replace(DIACRITICS, '');
}

function normalizePersian(s: string): string {
  return s.replace(/[^\w\s\d]/g, (c) => PERSIAN_NORMALIZE[c] ?? c);
}

function extractPersianNumbers(s: string): string {
  const digitMap: Record<string, string> = {};
  for (let i = 0; i < 10; i++) {
    digitMap[PERSIAN_DIGITS[i]] = String(i);
    digitMap[ARABIC_DIGITS[i]] = String(i);
  }
  return s.replace(/[۰-۹٠-٩]/g, (c) => digitMap[c] ?? c);
}

const HIGH_RISK_KEYWORDS = [
  'فرار مالیاتی',
  'دور زدن',
  'جعل',
  'تخلف',
  'راه فرار',
  'پنهان کردن درآمد',
  'سوری',
  'کاهش غیرقانونی',
  'سندسازی',
];
const MEDIUM_RISK_KEYWORDS = [
  'محاسبه مالیات',
  'نرخ مالیات',
  'معافیت',
  'ارزش افزوده',
  'اظهارنامه',
  'مشمول',
  'ضریب',
  'مالیات بر درآمد',
];
const FORBIDDEN_PHRASES = ['دور زدن', 'فرار', 'جعل', 'سندسازی', 'پنهان'];

const TOPIC_CATEGORIES: Record<string, string[]> = {
  مالیات: [
    'مالیات',
    'مالیاتی',
    'ارزش افزوده',
    'اظهارنامه',
    'جریمه',
    'دیرکرد',
    'معافیت',
  ],
  حسابداری: ['حسابداری', 'حساب', 'ترازنامه', 'صورت مالی', 'حسابرس', 'دفتر'],
  'ثبت شرکت': ['ثبت شرکت', 'شرکت', 'سهامی', 'برند', 'ثبت نام'],
  'تامین اجتماعی': [
    'تامین اجتماعی',
    'بیمه',
    'کارگر',
    'کارفرما',
    'حقوق',
    'مزایا',
  ],
  قرارداد: ['قرارداد', 'پیمان', 'مالیات بر درآمد', 'حق تمبر'],
};

const SUB_TOPIC_MAP: Record<string, string[]> = {
  مالیات: [
    'مالیات بر ارزش افزوده',
    'معافیت‌های مالیاتی',
    'جرایم و دیرکرد',
    'اظهارنامه',
  ],
  حسابداری: ['حسابداری صنعتی', 'حسابداری مالی', 'حسابداری پیمانکاری'],
  قرارداد: ['قرارداد اجاره', 'قرارداد پیمانکاری', 'حق تمبر'],
};

class RiskResult {
  level!: RiskLevel;
  matchedKeyword?: string;
}

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  private normalizePersian(text: string): string {
    if (!text) return '';
    let normalized = text;
    // Remove diacritics (harakat)
    normalized = removeDiacritics(normalized);
    // Normalize Persian characters
    normalized = normalizePersian(normalized);
    // Convert Persian numbers to English
    normalized = extractPersianNumbers(normalized).toString();
    // Remove extra spaces and special chars
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
  }

  private expandTerms(text: string): string[] {
    const normalized = this.normalizePersian(text);
    const words = normalized.split(/\s+/).filter((w) => w.length > 1);
    const expanded = new Set<string>();
    for (const w of words) {
      expanded.add(w);
      if (w.startsWith('می')) expanded.add(w.slice(2));
      if (w.endsWith('های')) expanded.add(w.slice(0, -2));
      if (w.endsWith('ها')) expanded.add(w.slice(0, -2));
      if (w.endsWith('ان')) expanded.add(w.slice(0, -2));
      if (w.endsWith('ات')) expanded.add(w.slice(0, -2));
    }
    return [...expanded];
  }

  private extractBigrams(words: string[]): string[] {
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(words[i] + ' ' + words[i + 1]);
    }
    return bigrams;
  }

  private getFallbackAnswer(topic: string | null): string {
    const fallbackMap: Record<string, string> = {
      مالیات:
        'برای سوالات مالیاتی، می‌توانید از بخش مقالات مالیاتی یا فرم مشاوره استفاده کنید.',
      حسابداری:
        'برای سوالات حسابداری، دوره‌های آموزشی ما را بررسی کنید یا درخواست مشاوره ثبت کنید.',
      'ثبت شرکت':
        'برای ثبت شرکت، می‌توانید از راهنمای ثبت شرکت در سایت استفاده کنید یا با کارشناسان ما تماس بگیرید.',
      'تامین اجتماعی':
        'برای سوالات تامین اجتماعی، لطفاً با کارشناسان ما تماس بگیرید یا از فرم مشاوره استفاده کنید.',
      قرارداد:
        'برای سوالات قراردادها، می‌توانید از مقالات مرتبط استفاده کنید یا درخواست مشاوره حقوقی ثبت کنید.',
    };
    return (
      fallbackMap[topic || ''] ||
      'متاسفانه پاسخ مناسبی برای این سوال پیدا نشد. لطفاً با کارشناسان ما تماس بگیرید یا از فرم مشاوره استفاده کنید.'
    );
  }

  private classifyRisk(question: string): RiskResult {
    const q = this.normalizePersian(question);
    for (const keyword of FORBIDDEN_PHRASES) {
      if (q.includes(keyword))
        return { level: 'forbidden', matchedKeyword: keyword };
    }
    for (const keyword of HIGH_RISK_KEYWORDS) {
      if (q.includes(keyword))
        return { level: 'high', matchedKeyword: keyword };
    }
    for (const keyword of MEDIUM_RISK_KEYWORDS) {
      if (q.includes(keyword))
        return { level: 'medium', matchedKeyword: keyword };
    }
    return { level: 'low' };
  }

  private detectTopic(question: string): string | null {
    const q = this.normalizePersian(question);
    let bestTopic: string | null = null;
    let bestScore = 0;
    for (const [topic, keywords] of Object.entries(TOPIC_CATEGORIES)) {
      const score = keywords.filter((kw) => q.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }
    return bestScore > 0 ? bestTopic : null;
  }

  private buildTopicSuggestions(question: string): string {
    const q = this.normalizePersian(question);
    const matchedTopics: string[] = [];
    for (const [topic, keywords] of Object.entries(TOPIC_CATEGORIES)) {
      if (keywords.some((kw) => q.includes(kw))) {
        matchedTopics.push(topic);
      }
    }
    if (matchedTopics.length === 0) return '';

    const subTopics = matchedTopics.flatMap((t) => SUB_TOPIC_MAP[t] || []);
    if (subTopics.length === 0) return '';

    const sample = subTopics
      .slice(0, 3)
      .map((st) => `• ${st}`)
      .join('\n');
    return `\n\n💡 می‌توانید سوال خود را دقیق‌تر بپرسید، مثلاً:\n${sample}`;
  }

  private formatProfessionalAnswer(params: {
    answer: string;
    source: string;
    confidence: number;
    riskLevel: RiskLevel;
    relatedTopics?: string[];
  }): string {
    const cleanAnswer = params.answer.trim();
    const confidenceLabel =
      params.confidence >= 8
        ? 'بالا'
        : params.confidence >= 3
          ? 'متوسط'
          : 'محدود';
    const riskNotice =
      params.riskLevel === 'medium'
        ? '\n\n⚠️ توجه: این پاسخ عمومی است؛ قبل از اقدام اجرایی، وضعیت پرونده، سال مالی و مستندات باید بررسی شود.'
        : '';
    const related = params.relatedTopics?.length
      ? `\n\n🔎 مسیرهای پیشنهادی بعدی:\n${params.relatedTopics
          .slice(0, 3)
          .map((topic) => `• ${topic}`)
          .join('\n')}`
      : '';

    return [
      '✅ پاسخ تخصصی آیان تراز',
      '',
      cleanAnswer,
      riskNotice,
      related,
      '',
      `📚 منبع پاسخ: ${params.source}`,
      `🎯 سطح اطمینان بازیابی: ${confidenceLabel}`,
      '📌 اگر مبلغ، تاریخ، نوع شخصیت حقیقی/حقوقی یا سال مالی در سوال اثر دارد، همان جزئیات را هم ارسال کنید تا پاسخ دقیق‌تر شود.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildEscalationAnswer(reason: 'high' | 'forbidden'): string {
    if (reason === 'forbidden') {
      return [
        '⛔ این درخواست در محدوده راهنمایی مجاز سامانه نیست.',
        'من نمی‌توانم درباره دور زدن قانون، جعل، سندسازی یا پنهان‌سازی درآمد راهکار ارائه کنم.',
        '✅ مسیر امن: موضوع را به شکل قانونی مطرح کنید؛ مثلاً «روش صحیح اصلاح اظهارنامه» یا «نحوه اعتراض قانونی به برگ تشخیص».',
      ].join('\n');
    }

    return [
      '⚠️ این موضوع ریسک اجرایی بالایی دارد و پاسخ قطعی بدون بررسی پرونده قابل اتکا نیست.',
      '✅ اقدام پیشنهادی: از بخش «ثبت وقت مشاوره» درخواست بدهید تا کارشناس با اطلاعات پرونده، تاریخ‌ها، مبالغ و مستندات بررسی کند.',
      '📌 تا قبل از بررسی تخصصی، از اقدام برگشت‌ناپذیر یا ارسال اطلاعات ناقص به سامانه‌های رسمی خودداری کنید.',
    ].join('\n');
  }

  private async searchKnowledge(
    question: string,
    contextQuestions?: string[],
  ): Promise<{
    answer: string;
    source: string;
    confidence: number;
    relatedTopics?: string[];
  } | null> {
    const allTexts = [question, ...(contextQuestions || [])].join(' ');
    const terms = this.expandTerms(allTexts);
    const bigrams = this.extractBigrams(terms);

    if (terms.length === 0 && bigrams.length === 0) return null;

    const matches = await this.prisma.knowledgeBase.findMany({
      where: {
        isActive: true,
        OR: [
          ...terms.map((word) => ({
            question: { contains: word, mode: 'insensitive' as const },
          })),
          ...bigrams.map((phrase) => ({
            question: { contains: phrase, mode: 'insensitive' as const },
          })),
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    if (matches.length > 0) {
      const scored = matches.map((m) => {
        const q = this.normalizePersian(m.question);
        const a = this.normalizePersian(m.answer);
        let score = terms.filter((t) => q.includes(t)).length * 2;
        score += bigrams.filter((b) => q.includes(b)).length * 3;
        score += terms.filter((t) => a.includes(t)).length;
        score +=
          this.normalizePersian(question)
            .split(/\s+/)
            .filter((w) => q.includes(w)).length * 1.5;
        return { match: m, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      let answer = best.match.answer;
      const source = `knowledge_base:${best.match.id}`;

      if (scored.length > 1 && scored[1].score > 0) {
        const related = scored.slice(1, 3).filter((s) => s.score > 0);
        if (related.length > 0) {
          answer += '\n\n---\n📌 مطالب مرتبط:\n';
          answer += related.map((r) => `• ${r.match.question}`).join('\n');
        }
      }

      return {
        answer,
        source,
        confidence: best.score,
        relatedTopics: scored
          .slice(1, 3)
          .filter((s) => s.score > 0)
          .map((s) => s.match.question),
      };
    }

    const faqMatches = await this.prisma.content.findMany({
      where: {
        contentType: 'faq',
        status: 'published',
        visibility: 'public',
        OR: [
          ...terms.map((word) => ({
            title: { contains: word, mode: 'insensitive' as const },
          })),
          ...bigrams.map((phrase) => ({
            title: { contains: phrase, mode: 'insensitive' as const },
          })),
        ],
      },
      take: 3,
    });

    if (faqMatches.length > 0) {
      const scored = faqMatches
        .map((m) => {
          const title = this.normalizePersian(m.title);
          const score =
            terms.filter((t) => title.includes(t)).length * 2 +
            bigrams.filter((b) => title.includes(b)).length * 3;
          return { match: m, score };
        })
        .sort((a, b) => b.score - a.score);

      return {
        answer: scored[0].match.body,
        source: `faq:${scored[0].match.id}`,
        confidence: scored[0].score,
      };
    }

    const articleMatches = await this.prisma.content.findMany({
      where: {
        contentType: 'article',
        status: 'published',
        visibility: 'public',
        OR: [
          ...terms.map((word) => ({
            OR: [
              { title: { contains: word, mode: 'insensitive' as const } },
              { summary: { contains: word, mode: 'insensitive' as const } },
            ],
          })),
          ...bigrams.map((phrase) => ({
            OR: [
              { title: { contains: phrase, mode: 'insensitive' as const } },
              { summary: { contains: phrase, mode: 'insensitive' as const } },
            ],
          })),
        ],
      },
      take: 3,
    });

    if (articleMatches.length > 0) {
      const scored = articleMatches
        .map((m) => {
          const title = this.normalizePersian(m.title || '');
          const summary = this.normalizePersian(m.summary || '');
          const score =
            terms.filter((t) => title.includes(t)).length * 2 +
            terms.filter((t) => summary.includes(t)).length;
          return { match: m, score };
        })
        .sort((a, b) => b.score - a.score);

      const article = scored[0].match;
      return {
        answer: article.summary || article.title,
        source: `article:${article.id}`,
        confidence: scored[0].score,
      };
    }

    return null;
  }

  private buildFallback(question: string, riskLevel: string): string {
    const topic = this.detectTopic(question);
    const suggestions = this.buildTopicSuggestions(question);

    if (riskLevel === 'high') {
      return this.buildEscalationAnswer('high');
    }

    if (topic && suggestions) {
      return [
        `✅ موضوع سوال شما را «${topic}» تشخیص دادم، اما در دانشنامه فعال فعلی پاسخ قطعی و قابل استناد پیدا نشد.`,
        suggestions.trim(),
        '🎯 برای پاسخ دقیق‌تر، مبلغ، سال مالی، نوع کسب‌وکار و مرحله پرونده را اضافه کنید.',
        '📞 اگر پرونده فوریت دارد، از مسیر ثبت وقت مشاوره اقدام کنید.',
      ].join('\n\n');
    }

    return [
      'برای این پرسش، پاسخ مستقیم و مستند در دانشنامه فعال پیدا نشد.',
      'برای اینکه پاسخ دقیق‌تر بدهم، لطفاً سوال را با این ساختار بفرستید:',
      '1) موضوع اصلی؛ 2) سال مالی یا تاریخ؛ 3) شخص حقیقی/حقوقی؛ 4) مبلغ یا سند اثرگذار؛ 5) هدف شما از پرسش.',
      'نمونه پرسش بهتر: «برای شرکت خدماتی در سال ۱۴۰۵، جریمه دیرکرد ارزش افزوده با مبلغ ... چگونه محاسبه می‌شود؟»',
    ].join('\n');
  }

  async query(question: string, userId?: number) {
    const sessionId = userId ? `session_${userId}` : this.generateSessionId();
    const conversation = await this.getOrCreateConversation(sessionId, userId);

    await this.logMessage(conversation.id, sessionId, userId, 'user', question);

    const risk = this.classifyRisk(question);

    if (risk.level === 'forbidden') {
      const refusal = this.buildEscalationAnswer('forbidden');
      await this.logMessage(conversation.id, sessionId, userId, 'bot', refusal);
      return { answer: refusal, riskLevel: risk.level, source: 'refused' };
    }

    const kbResult = await this.searchKnowledge(question, []);

    if (kbResult && kbResult.confidence >= 0.3) {
      const answer = this.formatProfessionalAnswer({
        answer: kbResult.answer,
        source: kbResult.source,
        confidence: kbResult.confidence,
        riskLevel: risk.level,
        relatedTopics: kbResult.relatedTopics,
      });

      await this.logMessage(conversation.id, sessionId, userId, 'bot', answer);
      return {
        answer,
        riskLevel: risk.level,
        source: kbResult.source,
        confidence: kbResult.confidence,
      };
    }

    if (risk.level === 'high') {
      await this.prisma.escalationTicket.create({
        data: {
          conversationId: conversation.id,
          userId: userId ?? undefined,
          reason: `High risk question with no KB match: ${question}`,
          status: 'open',
        },
      });
      const escalationMsg = this.buildEscalationAnswer('high');
      await this.logMessage(
        conversation.id,
        sessionId,
        userId,
        'bot',
        escalationMsg,
      );
      return {
        answer: escalationMsg,
        riskLevel: risk.level,
        source: 'escalated',
      };
    }

    const fallback = this.buildFallback(question, risk.level);
    await this.logMessage(conversation.id, sessionId, userId, 'bot', fallback);
    return { answer: fallback, riskLevel: risk.level, source: 'fallback' };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async getOrCreateConversation(sessionId: string, userId?: number) {
    let conversation = await this.prisma.chatConversation.findUnique({
      where: { sessionId },
    });
    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: { sessionId, userId, status: 'active' },
      });
    }
    return conversation;
  }

  private async logMessage(
    conversationId: number,
    sessionId: string,
    userId: number | undefined,
    role: string,
    content: string,
  ) {
    return this.prisma.chatMessage.create({
      data: { conversationId, sessionId, userId, role, content },
    });
  }

  async getKnowledgeBase(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.knowledgeBase.count(),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createKnowledgeEntry(
    data: {
      question: string;
      answer: string;
      category?: string;
      riskLevel?: RiskLevel;
    },
    userId: number,
  ) {
    const entry = await this.prisma.knowledgeBase.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category || '',
        riskLevel: data.riskLevel || 'low',
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'knowledge_base_create',
        entityType: 'knowledge_base',
        entityId: entry.id,
        newValue: { question: data.question, riskLevel: data.riskLevel },
      },
    });
    return entry;
  }

  async updateKnowledgeEntry(
    id: number,
    data: {
      question?: string;
      answer?: string;
      category?: string;
      riskLevel?: RiskLevel;
      isActive?: boolean;
    },
    userId: number,
  ) {
    const existing = await this.prisma.knowledgeBase.findUnique({
      where: { id },
    });
    if (!existing)
      throw new HttpException('مورد دانش یافت نشد', HttpStatus.NOT_FOUND);
    const entry = await this.prisma.knowledgeBase.update({
      where: { id },
      data,
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'knowledge_base_update',
        entityType: 'knowledge_base',
        entityId: id,
        oldValue: {
          question: existing.question,
          riskLevel: existing.riskLevel,
        },
        newValue: data,
      },
    });
    return entry;
  }

  async getConversation(sessionId: string, userId?: number, userRole?: string) {
    const where: { sessionId: string; userId?: number } = { sessionId };
    if (userRole === 'user') where.userId = userId;
    const conversation = await this.prisma.chatConversation.findFirst({
      where,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation)
      throw new HttpException('مکالمه یافت نشد', HttpStatus.NOT_FOUND);
    return conversation;
  }
}
