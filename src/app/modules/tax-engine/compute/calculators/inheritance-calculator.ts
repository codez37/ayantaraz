import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

const BASE_RATES: Record<string, number> = {
  BANK_DEPOSIT: 3,
  LISTED_SHARES: 0.5,
  UNLISTED_SHARES: 1,
  PROPERTY: 5,
  VEHICLE: 2,
  CLAIMS: 1,
  RIGHTS: 1,
  OTHER: 3,
};

const HEIR_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
};

interface AssetEntry {
  type: string;
  value: number;
}

@Injectable()
export class InheritanceCalculator implements ITaxCalculator {
  readonly type = 'INHERITANCE';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const assets = params['assets'] as AssetEntry[];
    const heirClass = Number(params['heirClass']) as 1 | 2 | 3;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return Promise.reject(
        new Error('Assets array is required and must not be empty'),
      );
    }

    if (![1, 2, 3].includes(heirClass)) {
      return Promise.reject(new Error('heirClass must be 1, 2, or 3'));
    }

    const multiplier = HEIR_MULTIPLIERS[heirClass];
    let totalTax = 0;
    let totalValue = 0;
    const items: Array<{
      type: string;
      value: number;
      rate: number;
      tax: number;
    }> = [];

    for (const asset of assets) {
      const baseRate = BASE_RATES[asset.type] ?? BASE_RATES['OTHER'];
      const rate = baseRate * multiplier;
      const tax = (asset.value * rate) / 100;

      totalValue += asset.value;
      totalTax += tax;
      items.push({ type: asset.type, value: asset.value, rate, tax });
    }

    const effectiveRate =
      totalValue > 0
        ? parseFloat(((totalTax / totalValue) * 100).toFixed(2))
        : 0;

    return Promise.resolve({
      type: this.type,
      grossAmount: totalValue,
      exemptionAmount: 0,
      taxableAmount: totalValue,
      taxAmount: totalTax,
      effectiveRate,
      details: {
        heirClass,
        items,
        multiplier,
      },
    });
  }
}
