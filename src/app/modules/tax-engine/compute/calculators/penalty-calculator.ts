import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

@Injectable()
export class PenaltyCalculator implements ITaxCalculator {
  readonly type = 'PENALTY';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const taxDue = Number(params['taxDue']);
    const daysLate = Number(params['daysLate']) || 30;
    const penaltyType = String(params['penaltyType'] || 'late_payment');

    if (taxDue < 0) {
      return Promise.reject(new Error('Tax due cannot be negative'));
    }

    let penaltyRate = 0;
    let penaltyAmount = 0;
    let label = '';

    switch (penaltyType) {
      case 'late_payment':
        penaltyRate = 2.5;
        label = 'جریمه دیرکرد پرداخت';
        penaltyAmount = Math.round(
          ((taxDue * penaltyRate) / 100) * Math.ceil(daysLate / 30),
        );
        break;
      case 'late_return':
        penaltyRate = 30;
        label = 'جریمه دیرکرد تسلیم اظهارنامه';
        penaltyAmount = Math.round((taxDue * penaltyRate) / 100);
        break;
      case 'underreporting':
        penaltyRate = 10;
        label = 'جریمه اظهار خلاف واقع';
        penaltyAmount = Math.round((taxDue * penaltyRate) / 100);
        break;
      case 'non_submission':
        penaltyRate = 50;
        label = 'جریمه عدم تسلیم اظهارنامه';
        penaltyAmount = Math.round((taxDue * penaltyRate) / 100);
        break;
      default:
        penaltyRate = 2.5;
        label = 'جریمه دیرکرد';
        penaltyAmount = Math.round(
          ((taxDue * penaltyRate) / 100) * Math.ceil(daysLate / 30),
        );
    }

    return Promise.resolve({
      type: this.type,
      grossAmount: taxDue,
      exemptionAmount: 0,
      taxableAmount: 0,
      taxAmount: penaltyAmount,
      effectiveRate: penaltyRate,
      details: {
        penaltyType,
        penaltyRate,
        daysLate,
        label,
        totalDue: taxDue + penaltyAmount,
      },
    });
  }
}
