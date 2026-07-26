import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

@Injectable()
export class TransferCalculator implements ITaxCalculator {
  readonly type = 'TRANSFER';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const amount = Number(params['amount']);

    if (amount < 0) {
      return Promise.reject(new Error('Transfer amount cannot be negative'));
    }

    const taxAmount = amount * 0.05;

    return Promise.resolve({
      type: this.type,
      grossAmount: amount,
      exemptionAmount: 0,
      taxableAmount: amount,
      taxAmount,
      effectiveRate: 5,
      details: { rate: 5, ref: 'ماده ۹۵' },
    });
  }
}
