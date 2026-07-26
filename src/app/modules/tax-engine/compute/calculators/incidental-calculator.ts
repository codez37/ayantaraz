import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

@Injectable()
export class IncidentalCalculator implements ITaxCalculator {
  readonly type = 'INCIDENTAL';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  async calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const amount = Number(params['amount']);
    const year = Number(params['year']) || 1403;

    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const brackets = await this.prisma.taxBracket.findMany({
      where: { year, type: 'INCIDENTAL' },
      orderBy: { bracketOrder: 'asc' },
    });

    let totalTax = 0;
    let remaining = amount;
    const breakdown: CalcResult['breakdown'] = [];

    for (const bracket of brackets) {
      if (remaining <= 0) break;

      const bracketMin = Number(bracket.minAmount);
      const bracketMax = bracket.maxAmount
        ? Number(bracket.maxAmount)
        : Infinity;
      const bracketRange = bracketMax - bracketMin;
      const taxableInBracket = Math.min(remaining, Math.max(0, bracketRange));
      const bracketTax = (taxableInBracket * bracket.rate) / 100;

      totalTax += bracketTax;
      breakdown.push({
        range:
          bracketMax === Infinity
            ? `${bracketMin} - ∞`
            : `${bracketMin} - ${bracketMax}`,
        rate: bracket.rate,
        taxable: taxableInBracket,
        tax: bracketTax,
      });

      remaining -= taxableInBracket;
    }

    const effectiveRate =
      amount > 0 ? parseFloat(((totalTax / amount) * 100).toFixed(2)) : 0;

    return {
      type: this.type,
      grossAmount: amount,
      exemptionAmount: 0,
      taxableAmount: amount,
      taxAmount: totalTax,
      effectiveRate,
      breakdown,
      details: { year },
    };
  }
}
