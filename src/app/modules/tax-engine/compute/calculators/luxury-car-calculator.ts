import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

interface LuxCarThreshold {
  year: number;
  threshold: number;
  rate: number;
}

const THRESHOLDS: LuxCarThreshold[] = [
  { year: 1400, threshold: 1_000_000_000, rate: 1 },
  { year: 1401, threshold: 1_000_000_000, rate: 1 },
  { year: 1402, threshold: 3_000_000_000, rate: 1 },
  { year: 1403, threshold: 3_500_000_000, rate: 1 },
  { year: 1404, threshold: 5_000_000_000, rate: 1 },
  { year: 1405, threshold: 7_500_000_000, rate: 1 },
];

@Injectable()
export class LuxuryCarCalculator implements ITaxCalculator {
  readonly type = 'LUXURY_CAR';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const carValue = Number(params['value']) || Number(params['amount']) || 0;
    const year = Number(params['year']) || 1404;

    if (carValue < 0) {
      return Promise.reject(new Error('Car value cannot be negative'));
    }

    const config =
      [...THRESHOLDS].reverse().find((t) => t.year <= year) ||
      THRESHOLDS[THRESHOLDS.length - 1];
    const excess = Math.max(0, carValue - config.threshold);
    const taxAmount = (excess * config.rate) / 100;

    return Promise.resolve({
      type: this.type,
      grossAmount: carValue,
      exemptionAmount: Math.min(carValue, config.threshold),
      taxableAmount: excess,
      taxAmount,
      effectiveRate:
        carValue > 0 ? Math.round((taxAmount / carValue) * 10000) / 100 : 0,
      details: {
        carValue,
        threshold: config.threshold,
        rate: config.rate,
        year,
        ref: 'بند (ت) تبصره (۱) قانون بودجه',
      },
    });
  }
}
