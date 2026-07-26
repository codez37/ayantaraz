import { Injectable, Logger } from '@nestjs/common';
import { QueryRouterService } from './router/query-router.service';
import { PersianSearchEngineService } from './search/persian-search-engine.service';
import { TaxComputeEngineService } from './compute/tax-compute-engine.service';
import { StateManagerService } from './session/state-manager.service';
import { ResponseFormatterService } from './response/response-formatter.service';
import {
  ConfidenceEngineService,
  ConfidenceResult,
} from './confidence/confidence-engine.service';
import { createAuditEntry } from './shared/audit';
import { QueryResult } from './interfaces/query-result.interface';
import { SearchResult } from './interfaces/search-result.interface';

const PERSIAN_DIGIT_MAP: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(
    private readonly queryRouter: QueryRouterService,
    private readonly searchEngine: PersianSearchEngineService,
    private readonly computeEngine: TaxComputeEngineService,
    private readonly stateManager: StateManagerService,
    private readonly formatter: ResponseFormatterService,
    private readonly confidenceEngine: ConfidenceEngineService,
  ) {}

  async processQuery(
    sessionId: string | undefined,
    message: string,
  ): Promise<QueryResult & { sessionId: string }> {
    const { session } = await this.stateManager.getOrCreateSession(sessionId);
    const type = this.queryRouter.detect(message);

    await this.stateManager.addHistory(session.id, {
      role: 'user',
      content: message,
      type,
    });

    let result: QueryResult;

    switch (type) {
      case 'SEARCH':
        result = await this.handleSearch(session.id, message);
        break;
      case 'CALC':
        result = await this.handleCalc(session.id, message);
        break;
      case 'PROCEDURE':
        result = await this.handleProcedure(session.id, message);
        break;
      default:
        result = this.handleUnknown();
        break;
    }

    // History write is recoverable — don't let it mask critical errors
    try {
      await this.stateManager.addHistory(session.id, {
        role: 'assistant',
        content: result.answer || '',
        type,
      });

      await this.stateManager.updateStep(
        session.id,
        'results_displayed' as never,
      );
    } catch (historyError) {
      this.logger.warn(
        'History write failed (recoverable)',
        historyError instanceof Error ? historyError.message : historyError,
      );
    }

    return { ...result, sessionId: session.id };
  }

  private async handleSearch(
    _sessionId: string,
    query: string,
  ): Promise<QueryResult> {
    const results = await this.searchEngine.search(query);
    const answer = this.formatter.formatSearch(query, results);
    const referencedArticles = results.map((r) => r.articleNumber);

    return {
      type: 'SEARCH',
      answer,
      results,
      referencedArticles,
    };
  }

  private async handleCalc(
    sessionId: string,
    query: string,
  ): Promise<QueryResult> {
    const calcType = this.detectCalcType(query);

    // Evaluate confidence before calculating
    const confidence = this.confidenceEngine.evaluate(query, calcType);

    // If confidence is low, ask for clarification
    if (!confidence.isConfident && confidence.clarificationPrompt) {
      await this.stateManager.updateSession(sessionId, {
        calcType,
        calcParams: {
          amount: confidence.entities.amount,
          year: confidence.entities.year,
          businessType: confidence.entities.businessType,
        },
      });

      return {
        type: 'CALC',
        answer: confidence.clarificationPrompt,
        confidence,
      };
    }

    // Use extracted entities from confidence engine
    const amount = confidence.entities.amount;
    const year = confidence.entities.year || new Date().getFullYear() - 621;
    const businessType = confidence.entities.businessType || 'عمده فروشی';
    const businessCode = confidence.entities.businessCode || undefined;
    const hasPartner = confidence.entities.hasPartner;
    const partnerCount = confidence.entities.partnerCount;

    if (!amount || amount <= 0) {
      return {
        type: 'UNKNOWN',
        answer:
          'لطفاً مبلغ مورد نظر را به صورت عددی وارد کنید (مثلاً ۱۵ میلیون تومان).',
      };
    }

    await this.stateManager.updateSession(sessionId, {
      calcType,
      calcParams: {
        amount,
        year,
        businessType,
        businessCode,
        hasPartner,
        partnerCount,
      },
    });

    const computation = await this.computeEngine.calculate(calcType, {
      amount,
      year,
      businessType,
      businessCode,
      hasPartner,
      partnerCount,
    });

    let articleRefs: string[] = [];
    switch (calcType) {
      case 'SALARY':
        articleRefs = ['84', '85'];
        break;
      case 'RENTAL':
        articleRefs = ['53'];
        break;
      case 'INHERITANCE':
        articleRefs = ['71', '72', '73'];
        break;
      case 'TRANSFER':
        articleRefs = ['95'];
        break;
      case 'CORPORATE':
        articleRefs = ['105'];
        break;
      case 'BUSINESS':
        articleRefs = [
          '93',
          '94',
          '95',
          '96',
          '97',
          '98',
          '99',
          '100',
          '101',
          '131',
        ];
        break;
      case 'VAT':
        articleRefs = ['1', '2', '12', '13', '14', '15', '16', '17'];
        break;
      case 'PROPERTY':
        articleRefs = [
          '52',
          '53',
          '54',
          '55',
          '56',
          '57',
          '58',
          '59',
          '60',
          '61',
          '62',
          '63',
          '64',
        ];
        break;
      case 'INCIDENTAL':
        articleRefs = [
          '119',
          '120',
          '121',
          '122',
          '123',
          '124',
          '125',
          '126',
          '127',
          '128',
          '129',
          '130',
          '131',
        ];
        break;
      case 'PENALTY':
        articleRefs = [
          '189',
          '190',
          '191',
          '192',
          '193',
          '194',
          '195',
          '196',
          '197',
          '198',
          '199',
          '200',
          '201',
        ];
        break;
      case 'VACANT_HOME':
        articleRefs = ['54', '54 مکرر'];
        break;
      case 'LUXURY_CAR':
        articleRefs = ['149'];
        break;
    }

    const answer = this.formatter.formatCalc(
      computation,
      articleRefs,
      confidence.explainability,
    );

    // Create audit trail for completed calculation
    const auditEntry = createAuditEntry({
      calcType,
      inputs: {
        amount,
        year,
        businessType,
        businessCode,
        hasPartner,
        partnerCount,
      },
      rulesApplied: confidence.filledSlots.map((s) => `${s.name}=${s.value}`),
      articleRefs,
      finalFormula: `${calcType}: amount=${amount}, year=${year}, type=${businessType}`,
      result: {
        grossAmount: computation.grossAmount,
        taxAmount: computation.taxAmount,
        effectiveRate: computation.effectiveRate,
        breakdown: computation.breakdown || [],
      },
      confidence: { score: confidence.score, version: confidence.version },
    });

    return {
      type: 'CALC',
      answer,
      computation,
      referencedArticles: articleRefs,
      confidence: {
        ...confidence,
        auditId: auditEntry.id,
      } as ConfidenceResult & { auditId: string },
    };
  }

  private async handleProcedure(
    _sessionId: string,
    query: string,
  ): Promise<QueryResult> {
    const articles = await this.searchEngine.search(query);
    const steps = this.extractProcedureSteps(articles);
    const articleRefs = articles.map((r) => r.articleNumber);

    const topic = this.detectProcedureTopic(query);

    if (steps.length === 0) {
      const answer = this.formatter.formatSearch(query, articles);
      return {
        type: 'PROCEDURE',
        answer,
        referencedArticles: articleRefs,
      };
    }

    const answer = this.formatter.formatProcedure(topic, steps, articleRefs);

    return {
      type: 'PROCEDURE',
      answer,
      referencedArticles: articleRefs,
    };
  }

  private handleUnknown(): QueryResult {
    return { type: 'UNKNOWN', answer: this.formatter.formatUnknown() };
  }

  extractAmount(input: string): number | null {
    let normalized = input.replace(/[۰-۹]/g, (d) => PERSIAN_DIGIT_MAP[d] || d);
    normalized = normalized.replace(/،/g, '').replace(/,/g, '');

    const multipliers: Record<string, number> = {
      هزار: 1000,
      میلیون: 1000000,
      میلیارد: 1000000000,
    };

    const amountPattern = /(\d+)\s*(هزار|میلیون|میلیارد)?/;
    const match = normalized.match(amountPattern);
    if (match) {
      let amount = parseInt(match[1], 10);
      const unit = match[2] as string | undefined;
      if (unit && multipliers[unit]) {
        amount *= multipliers[unit];
      }
      return amount;
    }

    const pureNumber = normalized.match(/\d+/);
    if (pureNumber) {
      return parseInt(pureNumber[0], 10);
    }

    return null;
  }

  detectCalcType(input: string): string {
    if (/(حقوق|salary)/i.test(input)) return 'SALARY';
    if (/(اجاره|rental|اجاره\s+بها)/i.test(input)) return 'RENTAL';
    if (/(ارث|inheritance|وراثت)/i.test(input)) return 'INHERITANCE';
    if (/(نقل\s+و\s+انتقال|transfer)/i.test(input)) return 'TRANSFER';
    if (/(مشاغل|business|شغلی)/i.test(input)) return 'BUSINESS';
    if (/(شرکت|corporate|اشخاص\s+حقوقی)/i.test(input)) return 'CORPORATE';
    if (/(ارزش\s+افزوده|vat|value\s+added)/i.test(input)) return 'VAT';
    if (/(املاک|ملک|property|مسکن)/i.test(input)) return 'PROPERTY';
    if (/(اتفاقی|incidental|هدیه|جایزه|برنده)/i.test(input))
      return 'INCIDENTAL';
    if (/(جریمه|penalty|دیرکرد|تاخیر)/i.test(input)) return 'PENALTY';
    if (/(خانه خالی|خالی از سکنه|vacant)/i.test(input)) return 'VACANT_HOME';
    if (/(خودرو لوکس|ماشین لوکس|luxury car)/i.test(input)) return 'LUXURY_CAR';
    return 'SALARY';
  }

  extractProcedureSteps(articles: SearchResult[]): string[] {
    const steps: string[] = [];
    for (const article of articles) {
      const sentences = article.text
        .split(/[.!\n]/)
        .filter((s) => s.trim().length > 0);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (
          trimmed.includes('باید') ||
          trimmed.includes('می\u200cتواند') ||
          trimmed.includes('مهلت') ||
          trimmed.includes('الزام') ||
          trimmed.includes('موظف') ||
          trimmed.includes('مرحله')
        ) {
          steps.push(trimmed);
        }
      }
    }
    return steps.slice(0, 10);
  }

  private detectProcedureTopic(query: string): string {
    if (query.includes('اعتراض')) return 'مراحل اعتراض به برگ تشخیص';
    if (query.includes('ثبت نام') || query.includes('ثبت\u200cنام'))
      return 'مراحل ثبت\u200cنام در سامانه';
    if (query.includes('اظهارنامه')) return 'نحوه تنظیم اظهارنامه مالیاتی';
    if (query.includes('مدارک')) return 'مدارک مورد نیاز';
    if (query.includes('تسلیم')) return 'مهلت تسلیم اظهارنامه';
    return 'راهنمای رویه مالیاتی';
  }

  private detectBusinessType(input: string): string {
    const normalizedInput = input.toLowerCase();

    // Wholesale patterns
    const wholesalePatterns = [
      /عمده\s*فروشی/i,
      /عمده\s*فروش/i,
      /wholesale/i,
      /فروش\s*عمده/i,
      /bulk\s*sale/i,
    ];
    if (wholesalePatterns.some((p) => p.test(normalizedInput))) {
      if (/لوازم\s*ساختمانی/i.test(normalizedInput))
        return 'عمده فروشی لوازم ساختمانی';
      if (/لوازم\s*بهداشتی/i.test(normalizedInput))
        return 'عمده فروشی لوازم بهداشتی';
      if (/مواد\s*غذایی/i.test(normalizedInput)) return 'عمده فروشی مواد غذایی';
      if (/پوشاک/i.test(normalizedInput)) return 'عمده فروشی پوشاک';
      if (/لوازم\s*خانگی/i.test(normalizedInput))
        return 'عمده فروشی لوازم خانگی';
      if (/آهن\s*آلات/i.test(normalizedInput)) return 'عمده فروشی آهن آلات';
      if (/لوازم\s*یدکی/i.test(normalizedInput)) return 'عمده فروشی لوازم یدکی';
      if (/تجهیزات\s*پزشکی/i.test(normalizedInput))
        return 'عمده فروشی تجهیزات پزشکی';
      return 'عمده فروشی';
    }

    // Retail patterns
    const retailPatterns = [
      /خرده\s*فروشی/i,
      /خرده\s*فروش/i,
      /retail/i,
      /فروشگاه/i,
      /مغازه/i,
      /store/i,
      /shop/i,
    ];
    if (retailPatterns.some((p) => p.test(normalizedInput))) {
      if (/لوازم\s*ساختمانی/i.test(normalizedInput))
        return 'خرده فروشی لوازم ساختمانی';
      if (/لوازم\s*بهداشتی/i.test(normalizedInput))
        return 'خرده فروشی لوازم بهداشتی';
      if (/مواد\s*غذایی/i.test(normalizedInput)) return 'خرده فروشی مواد غذایی';
      if (/پوشاک/i.test(normalizedInput)) return 'خرده فروشی پوشاک';
      if (/لوازم\s*خانگی/i.test(normalizedInput))
        return 'خرده فروشی لوازم خانگی';
      if (/طلا/i.test(normalizedInput)) return 'خرده فروشی طلا';
      if (/خودرو/i.test(normalizedInput)) return 'خرده فروشی خودرو';
      return 'خرده فروشی';
    }

    // Service patterns
    const servicePatterns = [
      /خدمات/i,
      /service/i,
      /تعمیر/i,
      /repair/i,
      /آموزش/i,
      /آموزشگاه/i,
    ];
    if (servicePatterns.some((p) => p.test(normalizedInput))) {
      if (/حسابداری/i.test(normalizedInput)) return 'خدمات حسابداری';
      if (/حقوقی/i.test(normalizedInput)) return 'خدمات حقوقی';
      if (/مشاوره/i.test(normalizedInput)) return 'خدمات مشاوره';
      if (/فناوری|کامپیوتر|نرم\s*افزار/i.test(normalizedInput))
        return 'خدمات فناوری اطلاعات';
      if (/تبلیغ/i.test(normalizedInput)) return 'خدمات تبلیغاتی';
      if (/حمل\s*ونقل|باربری|اسباب\s*کشی/i.test(normalizedInput))
        return 'حمل و نقل';
      if (/هتل|اقامت/i.test(normalizedInput)) return 'هتل';
      if (/رستوران|غذاخوری|آشپزخانه/i.test(normalizedInput)) return 'رستوران';
      if (/کافی\s*شاپ|کافه/i.test(normalizedInput)) return 'کافی شاپ';
      if (/آرایشگاه|آرایشگر/i.test(normalizedInput)) return 'آرایشگاه';
      if (/تعمیرگاه|تعمیر\s*خودرو|تعمیر\s*موتور/i.test(normalizedInput))
        return 'تعمیرگاه خودرو';
      return 'خدمات';
    }

    // Manufacturing patterns
    const manufacturingPatterns = [
      /تولیدی/i,
      /تولید/i,
      /manufacturing/i,
      /factory/i,
      /کارخانه/i,
      /کارگاه/i,
    ];
    if (manufacturingPatterns.some((p) => p.test(normalizedInput))) {
      if (/مواد\s*غذایی/i.test(normalizedInput)) return 'تولید مواد غذایی';
      if (/پوشاک/i.test(normalizedInput)) return 'تولید پوشاک';
      if (/لوازم\s*خانگی/i.test(normalizedInput)) return 'تولید لوازم خانگی';
      if (/مصالح\s*ساختمانی/i.test(normalizedInput))
        return 'تولید مصالح ساختمانی';
      if (/لوازم\s*بهداشتی/i.test(normalizedInput))
        return 'تولید لوازم بهداشتی';
      return 'تولیدی';
    }

    // Agriculture patterns
    const agriculturePatterns = [
      /کشاورزی/i,
      /باغداری/i,
      /دامداری/i,
      /مرغداری/i,
      /agriculture/i,
      /farming/i,
    ];
    if (agriculturePatterns.some((p) => p.test(normalizedInput))) {
      return 'کشاورزی';
    }

    // Default business type based on common patterns
    if (/فروش|sale|sell/i.test(normalizedInput)) return 'عمده فروشی';
    if (/بازرگانی|تجارت|trade|import|صادرات|واردات/i.test(normalizedInput))
      return 'عمده فروشی';

    return 'عمده فروشی'; // Default
  }

  private extractBusinessCode(input: string): string | undefined {
    // Look for 7-digit Intacode
    const codeMatch = input.match(/\b(\d{7})\b/);
    if (codeMatch) {
      return codeMatch[1];
    }
    return undefined;
  }

  private detectPartner(input: string): boolean {
    const partnerPatterns = [
      /شریک/i,
      /مشارکت/i,
      /شرکا/i,
      /partner/i,
      /partnership/i,
      /همکار/i,
      / مشترک/i,
    ];
    return partnerPatterns.some((p) => p.test(input));
  }

  private extractPartnerCount(input: string): number {
    // Look for patterns like "3 نفر شریک" or "دو شریک"
    const persianNumbers: Record<string, number> = {
      یک: 1,
      دو: 2,
      سه: 3,
      چهار: 4,
      پنج: 5,
      '۱': 1,
      '۲': 2,
      '۳': 3,
      '۴': 4,
      '۵': 5,
    };

    for (const [num, value] of Object.entries(persianNumbers)) {
      if (input.includes(`${num} نفر شریک`) || input.includes(`${num} شریک`)) {
        return value;
      }
    }

    // Look for digit patterns
    const countMatch = input.match(/(\d+)\s*(نفر\s*)?شریک/);
    if (countMatch) {
      return parseInt(countMatch[1], 10);
    }

    return 0;
  }
}
