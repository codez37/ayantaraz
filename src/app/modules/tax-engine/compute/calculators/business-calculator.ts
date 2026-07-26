import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

interface BusinessData {
  annualIncome: number;
  businessType: string;
  businessCode?: string;
  year: number;
  hasPartner?: boolean;
  partnerCount?: number;
}

@Injectable()
export class BusinessCalculator implements ITaxCalculator {
  readonly type = 'BUSINESS';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  async calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const annualIncome = Number(params['amount']);
    const year = Number(params['year']) || 1404;
    const businessType = String(params['businessType'] || 'عمده فروشی');
    const businessCode = params['businessCode'] as string | undefined;
    const hasPartner = Boolean(params['hasPartner']);
    const partnerCount = Number(params['partnerCount']) || 0;

    if (annualIncome < 0) {
      throw new Error('Business income cannot be negative');
    }

    // 1. Maddah 101 Exemption (2 billion Rials for 1404)
    const exemptionAmount = this.getExemptionAmount(year);

    // 2. Check if income is below exemption
    if (annualIncome <= exemptionAmount) {
      return {
        type: this.type,
        grossAmount: annualIncome,
        exemptionAmount: annualIncome,
        taxableAmount: 0,
        taxAmount: 0,
        effectiveRate: 0,
        breakdown: [
          {
            range: `تا ${this.formatRials(exemptionAmount)} ریال`,
            rate: 0,
            taxable: 0,
            tax: 0,
          },
        ],
        details: {
          year,
          message: `درآمد شما (${this.formatRials(annualIncome)} ریال) کمتر از سقف معافیت ماده ۱۰۱ (${this.formatRials(exemptionAmount)} ریال) است و از پرداخت مالیات معاف هستید.`,
          isExempt: true,
          article: '101',
        },
      };
    }

    // 3. Calculate profit based on business type (Intacode coefficient)
    const profitCoefficient = this.getProfitCoefficient(
      businessType,
      businessCode,
    );
    const taxableProfit = Math.floor(annualIncome * profitCoefficient);

    // 4. Apply Maddah 131 tax rates
    const taxableAfterExemption = taxableProfit - exemptionAmount;
    const taxResult = this.calculateTax(taxableAfterExemption);

    // 5. Check for special cases
    const specialNote = this.getSpecialNote(businessType, annualIncome, year);

    // 6. Build breakdown
    const breakdown = this.buildBreakdown(
      annualIncome,
      profitCoefficient,
      exemptionAmount,
      taxResult,
    );

    return {
      type: this.type,
      grossAmount: annualIncome,
      exemptionAmount,
      taxableAmount: taxableProfit,
      taxAmount: taxResult.totalTax,
      annualTaxAmount: taxResult.totalTax,
      effectiveRate: parseFloat(
        ((taxResult.totalTax / annualIncome) * 100).toFixed(2),
      ),
      breakdown,
      details: {
        year,
        profitCoefficient,
        profitCoefficientPercent: `${(profitCoefficient * 100).toFixed(0)}%`,
        taxableProfit,
        taxBrackets: taxResult.brackets,
        specialNote,
        hasPartner,
        partnerCount,
        article: '131',
        exemptionArticle: '101',
      },
    };
  }

  private getExemptionAmount(year: number): number {
    const exemptions: Record<number, number> = {
      1390: 150000000,
      1391: 180000000,
      1392: 216000000,
      1393: 252000000,
      1394: 300000000,
      1395: 360000000,
      1396: 396000000,
      1397: 396000000,
      1398: 420000000,
      1399: 441000000,
      1400: 396000000,
      1401: 396000000,
      1402: 475000000,
      1403: 1000000000,
      1404: 2000000000,
      1405: 2800000000,
    };
    return exemptions[year] || 2000000000;
  }

  private getProfitCoefficient(
    businessType: string,
    businessCode?: string,
  ): number {
    // Coefficients based on Intacode (Persian tax system)
    const coefficients: Record<string, number> = {
      // Wholesale
      'عمده فروشی': 0.022,
      'عمده فروشی مواد غذایی': 0.025,
      'عمده فروشی لوازم ساختمانی': 0.028,
      'عمده فروشی لوازم بهداشتی': 0.03,
      'عمده فروشی پوشاک': 0.035,
      'عمده فروشی لوازم خانگی': 0.025,
      'عمده فروشی آهن آلات': 0.02,
      'عمده فروشی لوازم یدکی': 0.03,
      'عمده فروشی تجهیزات پزشکی': 0.04,

      // Retail
      'خرده فروشی': 0.03,
      'خرده فروشی مواد غذایی': 0.035,
      'خرده فروشی لوازم ساختمانی': 0.035,
      'خرده فروشی لوازم بهداشتی': 0.04,
      'خرده فروشی پوشاک': 0.05,
      'خرده فروشی لوازم خانگی': 0.035,
      'خرده فروشی طلا': 0.015,
      'خرده فروشی خودرو': 0.01,
      'فروشگاه زنجیره‌ای': 0.025,

      // Services
      خدمات: 0.35,
      'خدمات حسابداری': 0.35,
      'خدمات حقوقی': 0.4,
      'خدمات مشاوره': 0.35,
      'خدمات فناوری اطلاعات': 0.35,
      'خدمات تبلیغاتی': 0.4,
      'حمل و نقل': 0.25,
      'اسباب کشی': 0.3,
      باربری: 0.25,
      هتل: 0.35,
      رستوران: 0.4,
      'کافی شاپ': 0.4,
      آرایشگاه: 0.45,
      'تعمیرگاه خودرو': 0.4,
      آموزشگاه: 0.4,
      آموزشی: 0.4,

      // Manufacturing
      تولیدی: 0.15,
      'تولید مواد غذایی': 0.12,
      'تولید پوشاک': 0.18,
      'تولید لوازم خانگی': 0.15,
      'تولید مصالح ساختمانی': 0.12,
      'تولید لوازم بهداشتی': 0.15,

      // Agriculture
      کشاورزی: 0.05,
      دامداری: 0.05,
      مرغداری: 0.05,
      باغبانی: 0.05,
    };

    // Try exact match first
    if (coefficients[businessType]) {
      return coefficients[businessType];
    }

    // Try partial match
    for (const [key, value] of Object.entries(coefficients)) {
      if (businessType.includes(key) || key.includes(businessType)) {
        return value;
      }
    }

    // Default coefficient for unknown business types
    return 0.25;
  }

  private calculateTax(taxableIncome: number): {
    totalTax: number;
    brackets: Array<{
      range: string;
      rate: number;
      amount: number;
      tax: number;
    }>;
  } {
    let remaining = taxableIncome;
    let totalTax = 0;
    const brackets: Array<{
      range: string;
      rate: number;
      amount: number;
      tax: number;
    }> = [];

    // Maddah 131 tax rates (in Rials)
    const taxBrackets = [
      { min: 0, max: 2000000000, rate: 0.15 }, // Up to 2 billion: 15%
      { min: 2000000000, max: 4000000000, rate: 0.2 }, // 2-4 billion: 20%
      { min: 4000000000, max: Infinity, rate: 0.25 }, // Over 4 billion: 25%
    ];

    for (const bracket of taxBrackets) {
      if (remaining <= 0) break;

      const bracketRange =
        bracket.max === Infinity ? Infinity : bracket.max - bracket.min;
      const taxableInBracket = Math.min(remaining, bracketRange);
      const bracketTax = Math.floor(taxableInBracket * bracket.rate);

      if (taxableInBracket > 0) {
        brackets.push({
          range:
            bracket.max === Infinity
              ? `بیش از ${this.formatRials(bracket.min)} ریال`
              : `${this.formatRials(bracket.min)} تا ${this.formatRials(bracket.max)} ریال`,
          rate: bracket.rate * 100,
          amount: taxableInBracket,
          tax: bracketTax,
        });
      }

      totalTax += bracketTax;
      remaining -= taxableInBracket;
    }

    return { totalTax, brackets };
  }

  private getSpecialNote(
    businessType: string,
    annualIncome: number,
    year: number,
  ): string | null {
    const notes: string[] = [];

    // Tبصره 100 check
    const tabarzeh100Limit = 21600000000; // 21.6 billion Rials for 1404
    if (annualIncome <= tabarzeh100Limit) {
      notes.push(
        `بر اساس تبصره ماده ۱۰۰، درآمد شما زیر سقف ${this.formatRials(tabarzeh100Limit)} ریال است و امکان پرداخت مالیات مقطوع وجود دارد.`,
      );
    }

    // Service businesses
    if (
      businessType.includes('خدمات') ||
      businessType.includes('تعمیر') ||
      businessType.includes('آموزش')
    ) {
      notes.push(
        'برای مشاغل خدماتی، ضریب سود بالاتری اعمال می‌شود. نگهداری اسناد هزینه‌ها می‌تواند مالیات را کاهش دهد.',
      );
    }

    // Wholesale
    if (businessType.includes('عمده')) {
      notes.push(
        'برای عمده فروشان، استفاده از پایانه فروشگاهی و صورتحساب الکترونیکی الزامی است.',
      );
    }

    // Retail
    if (businessType.includes('خرده')) {
      notes.push(
        'خرده فروشان موظف به استفاده از سامانه مودیان و صدور صورتحساب الکترونیکی هستند.',
      );
    }

    // High income warning
    if (annualIncome > 30000000000) {
      notes.push(
        'با توجه به حجم درآمد، شما در گروه اول مشاغل قرار می‌گیرید و تکالیف حسابداری سنگین‌تری دارید.',
      );
    }

    return notes.length > 0 ? notes.join('\n') : null;
  }

  private buildBreakdown(
    annualIncome: number,
    profitCoefficient: number,
    exemptionAmount: number,
    taxResult: {
      totalTax: number;
      brackets: Array<{
        range: string;
        rate: number;
        amount: number;
        tax: number;
      }>;
    },
  ): CalcResult['breakdown'] {
    const breakdown: CalcResult['breakdown'] = [];

    // Add exemption line
    breakdown.push({
      range: `معافیت ماده ۱۰۱ (${this.formatRials(exemptionAmount)} ریال)`,
      rate: 0,
      taxable: exemptionAmount,
      tax: 0,
    });

    // Add profit calculation
    breakdown.push({
      range: `سود مشمول مالیات (${(profitCoefficient * 100).toFixed(0)}% از فروش)`,
      rate: 0,
      taxable: Math.floor(annualIncome * profitCoefficient),
      tax: 0,
    });

    // Add tax brackets
    for (const bracket of taxResult.brackets) {
      breakdown.push({
        range: bracket.range,
        rate: bracket.rate,
        taxable: bracket.amount,
        tax: bracket.tax,
      });
    }

    return breakdown;
  }

  private formatRials(amount: number): string {
    return amount.toLocaleString('fa-IR');
  }
}
