import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

const VAT_RATE = 9;
const HEALTH_SURCHARGE = 1;

// From 1400 onward: single flat 9% rate (VAT + health surcharge merged)
// From 1403 onward: 10% (increase for pension fund)
const VAT_RATE_1403_PLUS = 10;

@Injectable()
export class VatCalculator implements ITaxCalculator {
  readonly type = 'VAT';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const amount = Number(params['amount']);
    const isExempt = params['isExempt'] === true;
    const year = Number(params['year']) || 1403;

    if (amount < 0) {
      return Promise.reject(new Error('Amount cannot be negative'));
    }

    if (isExempt) {
      return Promise.resolve({
        type: this.type,
        grossAmount: amount,
        exemptionAmount: amount,
        taxableAmount: 0,
        taxAmount: 0,
        effectiveRate: 0,
        details: { exempt: true, ref: 'مواد ۱۲-۱۵ قانون ارزش افزوده' },
      });
    }

    const effectiveRate = year >= 1403 ? VAT_RATE_1403_PLUS : VAT_RATE;
    const totalTax = Math.round((amount * effectiveRate) / 100);

    return Promise.resolve({
      type: this.type,
      grossAmount: amount,
      exemptionAmount: 0,
      taxableAmount: amount,
      taxAmount: totalTax,
      effectiveRate,
      details: {
        vatRate: effectiveRate,
        healthSurcharge: 0,
        vat: totalTax,
        health: 0,
        totalRate: effectiveRate,
        ref: year >= 1403 ? 'نرخ ۱۰٪ (مصوب ۱۴۰۳)' : 'نرخ ۹٪',
      },
    });
  }
}
