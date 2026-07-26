import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

@Injectable()
export class SalaryCalculator implements ITaxCalculator {
  readonly type = 'SALARY';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  async calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const monthlySalary = Number(params['amount']);
    const year = Number(params['year']) || 1403;

    if (monthlySalary < 0) {
      throw new Error('Salary amount cannot be negative');
    }

    const brackets = await this.prisma.taxBracket.findMany({
      where: { year, type: 'SALARY' },
      orderBy: { bracketOrder: 'asc' },
    });

    let totalTax = 0;
    let exemptionAmount = 0;
    let remaining = monthlySalary;
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

      if (bracket.rate === 0) {
        exemptionAmount += taxableInBracket;
      }

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

    const taxableAmount = monthlySalary - exemptionAmount;
    const effectiveRate =
      monthlySalary > 0
        ? parseFloat(((totalTax / monthlySalary) * 100).toFixed(2))
        : 0;

    return {
      type: this.type,
      grossAmount: monthlySalary,
      exemptionAmount,
      taxableAmount,
      taxAmount: totalTax,
      annualTaxAmount: totalTax * 12,
      effectiveRate,
      breakdown,
      details: { year },
    };
  }
}
