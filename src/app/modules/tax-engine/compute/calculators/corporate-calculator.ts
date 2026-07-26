import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

@Injectable()
export class CorporateCalculator implements ITaxCalculator {
  readonly type = 'CORPORATE';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const netProfit = Number(params['netProfit']);

    if (netProfit < 0) {
      return Promise.reject(new Error('Net profit cannot be negative'));
    }

    const taxAmount = netProfit * 0.25;

    return Promise.resolve({
      type: this.type,
      grossAmount: netProfit,
      exemptionAmount: 0,
      taxableAmount: netProfit,
      taxAmount,
      effectiveRate: 25,
      details: { rate: 25, ref: 'نرخ اشخاص حقوقی' },
    });
  }
}
