import { Injectable } from '@nestjs/common';
import { SearchResult } from '../interfaces/search-result.interface';
import { CalcResult } from '../interfaces/calc-result.interface';
import { ExplainabilityData } from '../confidence/confidence-engine.service';

const PERSIAN_DIGITS: Record<string, string> = {
  '0': '۰',
  '1': '۱',
  '2': '۲',
  '3': '۳',
  '4': '۴',
  '5': '۵',
  '6': '۶',
  '7': '۷',
  '8': '۸',
  '9': '۹',
};

@Injectable()
export class ResponseFormatterService {
  formatSearch(query: string, results: SearchResult[]): string {
    if (results.length === 0) {
      return `## جستجوی مواد قانونی\n\n**پرسش:** ${query}\n\nنتیجه‌ای یافت نشد.`;
    }

    let output = `## جستجوی مواد قانونی\n\n**پرسش:** ${query}\n\n### نتایج:\n\n`;
    for (const r of results) {
      output += `**ماده ${r.articleNumber}** — ${r.title}\n${r.text}\n`;
      if (r.notes && r.notes.length > 0) {
        output += `💡 نکات:\n`;
        for (const note of r.notes) {
          output += `• ${note}\n`;
        }
      }
      output += `📌 **ارجاع:** ماده ${r.articleNumber}\n\n---\n\n`;
    }
    return output.trim();
  }

  formatCalc(
    computation: CalcResult,
    articleRefs: string[],
    explainability?: ExplainabilityData,
  ): string {
    const calcTypeNames: Record<string, string> = {
      SALARY: 'مالیات بر حقوق',
      RENTAL: 'مالیات بر اجاره',
      INHERITANCE: 'مالیات بر ارث',
      TRANSFER: 'مالیات نقل و انتقال',
      BUSINESS: 'مالیات مشاغل',
      CORPORATE: 'مالیات شرکت‌ها',
      VAT: 'مالیات بر ارزش افزوده',
      PROPERTY: 'مالیات بر املاک',
      INCIDENTAL: 'مالیات بر درآمد اتفاقی',
      PENALTY: 'جرایم مالیاتی',
      VACANT_HOME: 'مالیات خانه‌های خالی',
      LUXURY_CAR: 'مالیات خودروهای لوکس',
    };

    const calcType = calcTypeNames[computation.type] || computation.type;
    const grossFormatted = this.formatPersianNumber(computation.grossAmount);
    const taxFormatted = this.formatPersianNumber(computation.taxAmount);

    let output = `## محاسبه ${calcType}\n\n**مبلغ ناخالص:** ${grossFormatted} تومان\n\n`;
    output += `| ردیف | محدوده (تومان) | نرخ | مالیات |\n`;
    output += `|------|----------------|-----|--------|\n`;

    if (computation.breakdown && computation.breakdown.length > 0) {
      for (let i = 0; i < computation.breakdown.length; i++) {
        const b = computation.breakdown[i];
        output += `| ${this.formatPersianNumber(i + 1)} | ${b.range} | ${b.rate}% | ${this.formatPersianNumber(b.tax)} |\n`;
      }
    }

    output += `\n**جمع مالیات:** ${taxFormatted} تومان\n`;
    output += `**نرخ مؤثر:** ${computation.effectiveRate}%\n`;

    if (computation.annualTaxAmount) {
      output += `**مالیات سالانه:** ${this.formatPersianNumber(computation.annualTaxAmount)} تومان\n`;
    }

    if (articleRefs.length > 0) {
      output += `\n📌 **مواد قانونی مرتبط:** ${articleRefs.join('، ')}`;
    }

    // Add explainability section
    if (explainability) {
      output += `\n\n---\n\n### مبنای محاسبه\n\n`;
      output += `• **نوع درخواست:** ${explainability.detectedIntent}\n`;
      output += `• **دقت تشخیص:** ${explainability.confidencePercent}%\n`;

      if (explainability.extractedEntities.amount) {
        output += `• **مبلغ:** ${this.formatPersianNumber(explainability.extractedEntities.amount as number)} ریال\n`;
      }
      if (explainability.extractedEntities.year) {
        output += `• **سال مالیاتی:** ${explainability.extractedEntities.year}\n`;
      }
      if (explainability.extractedEntities.businessType) {
        output += `• **نوع فعالیت:** ${explainability.extractedEntities.businessType}\n`;
      }
      if (explainability.extractedEntities.businessCoefficient) {
        output += `• **ضریب سود:** ${((explainability.extractedEntities.businessCoefficient as number) * 100).toFixed(1)}%\n`;
      }
      if (explainability.extractedEntities.hasPartner) {
        output += `• **شریک:** ${explainability.extractedEntities.partnerCount ? `${explainability.extractedEntities.partnerCount} نفر` : 'دارد'}\n`;
      }

      if (explainability.assumptions.length > 0) {
        output += `\n**فرضیات:**\n`;
        for (const assumption of explainability.assumptions) {
          output += `• ${assumption}\n`;
        }
      }
    }

    return output;
  }

  formatProcedure(
    topic: string,
    steps: string[],
    articleRefs: string[],
  ): string {
    let output = `## ${topic}\n\n`;
    for (let i = 0; i < steps.length; i++) {
      output += `${this.formatPersianNumber(i + 1)}. ${steps[i]}\n`;
    }
    if (articleRefs.length > 0) {
      output += `\n📌 **مواد قانونی مرتبط:** ${articleRefs.join('، ')}`;
    }
    return output;
  }

  formatUnknown(): string {
    return (
      'متوجه نوع سوال شما نشدم. لطفاً دقیق‌تر بپرسید:\n' +
      '- برای جستجوی ماده قانونی: «ماده ۱۱۴»، «نرخ مالیات بر ارث»\n' +
      '- برای محاسبه: «مالیات حقوق ۱۵ میلیون»، «مالیات اجاره ۱۰ میلیون»\n' +
      '- برای رویه: «مراحل اعتراض به برگ تشخیص»، «مدارک ثبت‌نام»'
    );
  }

  formatArticleDetail(article: {
    articleNumber: string;
    text: string;
    notes: string[];
    chapterTitle: string;
  }): string {
    let output = `## ماده ${article.articleNumber}\n\n`;
    output += `**${article.chapterTitle}**\n\n`;
    output += `${article.text}\n`;
    if (article.notes && article.notes.length > 0) {
      output += `\n💡 نکات:\n`;
      for (const note of article.notes) {
        output += `• ${note}\n`;
      }
    }
    return output.trim();
  }

  formatPersianNumber(num: number): string {
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.').replace(/[0-9]/g, (d) => PERSIAN_DIGITS[d] || d);
  }
}
