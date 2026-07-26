import { Injectable } from '@nestjs/common';
import { normalizeBusinessType } from './business-dictionary';

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

export interface ExtractedEntities {
  amount: number | null;
  amountUnit: 'ریال' | 'تومان' | null;
  year: number | null;
  businessType: string | null;
  businessCoefficient: number | null;
  hasPartner: boolean;
  partnerCount: number;
  businessCode: string | null;
  heirType: string | null;
  propertyType: string | null;
  hasInsurance: boolean | null;
  hasDeductions: boolean | null;
  hasMortgage: boolean | null;
  isCommercial: boolean | null;
  companyType: string | null;
  transferType: string | null;
  usage: string | null;
}

@Injectable()
export class EntityExtractorService {
  extract(message: string): ExtractedEntities {
    const normalized = this.normalizePersian(message);

    return {
      amount: this.extractAmount(normalized),
      amountUnit: this.extractAmountUnit(normalized),
      year: this.extractYear(normalized),
      businessType: this.extractBusinessType(normalized),
      businessCoefficient: this.extractBusinessCoefficient(normalized),
      hasPartner: this.detectPartner(normalized),
      partnerCount: this.extractPartnerCount(normalized),
      businessCode: this.extractBusinessCode(normalized),
      heirType: this.extractHeirType(normalized),
      propertyType: this.extractPropertyType(normalized),
      hasInsurance: this.detectInsurance(normalized),
      hasDeductions: this.detectDeductions(normalized),
      hasMortgage: this.detectMortgage(normalized),
      isCommercial: this.detectCommercial(normalized),
      companyType: this.extractCompanyType(normalized),
      transferType: this.extractTransferType(normalized),
      usage: this.extractUsage(normalized),
    };
  }

  private normalizePersian(text: string): string {
    return text
      .replace(/[ي]/g, 'ی')
      .replace(/[ك]/g, 'ک')
      .replace(/[ؤ]/g, 'و')
      .replace(/[إأآء]/g, 'ا')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/\u200C/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractAmount(text: string): number | null {
    let normalized = text.replace(/[۰-۹]/g, (d) => PERSIAN_DIGIT_MAP[d] || d);
    normalized = normalized.replace(/،/g, '').replace(/,/g, '');

    // Try with multiplier
    const withMultiplier = normalized.match(/(\d+)\s*(هزار|میلیون|میلیارد)/);
    if (withMultiplier) {
      let amount = parseInt(withMultiplier[1], 10);
      const multipliers: Record<string, number> = {
        هزار: 1000,
        میلیون: 1000000,
        میلیارد: 1000000000,
      };
      amount *= multipliers[withMultiplier[2]];
      return amount;
    }

    // Try pure number
    const pureNumber = normalized.match(/\b(\d{4,})\b/);
    if (pureNumber) {
      return parseInt(pureNumber[1], 10);
    }

    return null;
  }

  private extractAmountUnit(text: string): 'ریال' | 'تومان' | null {
    if (/تومان|تومان|تومان/i.test(text)) return 'تومان';
    if (/ریال|ریال/i.test(text)) return 'ریال';
    // Default: assume ریال (standard in Iranian tax law)
    return null;
  }

  private extractYear(text: string): number | null {
    // Check for Persian year patterns
    const persianYearPatterns = [
      /سال\s*(\d{4})/,
      /سال\s*مالیاتی\s*(\d{4})/,
      /مالیاتی\s*(\d{4})/,
      /(\d{4})/,
    ];

    for (const pattern of persianYearPatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= 1390 && year <= 1410) return year;
      }
    }

    // Try Arabic digits
    const arabicYear = text.match(/(\d{4})/);
    if (arabicYear) {
      const year = parseInt(arabicYear[1], 10);
      if (year >= 1390 && year <= 1410) return year;
    }

    return null;
  }

  private extractBusinessType(text: string): string | null {
    const result = normalizeBusinessType(text);
    return result?.canonical || null;
  }

  private extractBusinessCoefficient(text: string): number | null {
    const result = normalizeBusinessType(text);
    return result?.coefficient || null;
  }

  private detectPartner(text: string): boolean {
    return /شریک|مشارکت|شرکا|partner|همکار|مشترک|دو نفر|سه نفر/.test(text);
  }

  private extractPartnerCount(text: string): number {
    const persianNumbers: Record<string, number> = {
      یک: 1,
      دو: 2,
      سه: 3,
      چهار: 4,
      پنج: 5,
    };

    for (const [num, value] of Object.entries(persianNumbers)) {
      if (text.includes(`${num} نفر شریک`) || text.includes(`${num} شریک`)) {
        return value;
      }
    }

    const countMatch = text.match(/(\d+)\s*(نفر\s*)?شریک/);
    if (countMatch) return parseInt(countMatch[1], 10);

    return 0;
  }

  private extractBusinessCode(text: string): string | null {
    const codeMatch = text.match(/\b(\d{7})\b/);
    return codeMatch ? codeMatch[1] : null;
  }

  private extractHeirType(text: string): string | null {
    const heirTypes = [
      'پدر',
      'مادر',
      'فرزند',
      'پسر',
      'دختر',
      'همسر',
      'برادر',
      'خواهر',
      'عمو',
      'عمه',
      'دایی',
      'خاله',
      ' nephews',
      'grandchild',
    ];
    for (const type of heirTypes) {
      if (text.includes(type)) return type;
    }
    return null;
  }

  private extractPropertyType(text: string): string | null {
    if (/مسکونی|خانه|آپارتمان| واحد مسکونی/.test(text)) return 'مسکونی';
    if (/تجاری|مغازه|فروشگاه|اداری/.test(text)) return 'تجاری';
    return null;
  }

  private detectInsurance(text: string): boolean | null {
    if (/بیمه|بیمه\s*اجتماعی|تامین\s*اجتماعی/.test(text)) return true;
    if (/بدون\s*بیمه|بیمه\s*ندارم/.test(text)) return false;
    return null;
  }

  private detectDeductions(text: string): boolean | null {
    if (/کسورات|وام|جریمه|اقساط/.test(text)) return true;
    if (/کسورات\s*ندارم|بدون\s*کسور/.test(text)) return false;
    return null;
  }

  private detectMortgage(text: string): boolean | null {
    if (/رهن|ودیعه|سپرده/.test(text)) return true;
    if (/بدون\s*رهن|رهن\s*ندارم/.test(text)) return false;
    return null;
  }

  private detectCommercial(text: string): boolean | null {
    if (/تجاری|اداری|مغازه/.test(text)) return true;
    if (/مسکونی|خانه/.test(text)) return false;
    return null;
  }

  private extractCompanyType(text: string): string | null {
    if (/سهامی\s*خاص/.test(text)) return 'سهامی خاص';
    if (/سهامی\s*عام/.test(text)) return 'سهامی عام';
    if (/سئو\s*محدود|سئو\s*محدود/.test(text)) return 'سئو محدود';
    if (/تعاونی/.test(text)) return 'تعاونی';
    if (/مسئولیت\s*محدود/.test(text)) return 'مسئولیت محدود';
    return null;
  }

  private extractTransferType(text: string): string | null {
    if (/فروش/.test(text)) return 'فروش';
    if (/هبه/.test(text)) return 'هبه';
    if (/交换|معوض/.test(text)) return '交换';
    return null;
  }

  private extractUsage(text: string): string | null {
    if (/مسکونی|خانه|آپارتمان/.test(text)) return 'مسکونی';
    if (/تجاری|مغازه|فروشگاه/.test(text)) return 'تجاری';
    if (/اداری|دفتر/.test(text)) return 'اداری';
    return null;
  }
}
