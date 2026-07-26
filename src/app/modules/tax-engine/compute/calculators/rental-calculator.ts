import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

@Injectable()
export class RentalCalculator implements ITaxCalculator {
  readonly type = 'RENTAL';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  async calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const monthlyRent = Number(params['amount']);
    const isResidential = params['isResidential'] === true;
    const year = Number(params['year']) || 1403;

    if (monthlyRent < 0) {
      throw new Error('Rental amount cannot be negative');
    }

    const expenseDeduction = monthlyRent * 0.25;
    let taxableRent = monthlyRent - expenseDeduction;
    let residentialDiscount = 0;

    if (isResidential) {
      residentialDiscount = taxableRent * 0.4;
      taxableRent -= residentialDiscount;
    }

    let taxRate = 25;
    const bracket = await this.prisma.taxBracket.findFirst({
      where: { year, type: 'RENTAL' },
      orderBy: { bracketOrder: 'asc' },
    });

    if (bracket) {
      taxRate = bracket.rate;
    }

    const totalTax = (taxableRent * taxRate) / 100;

    return {
      type: this.type,
      grossAmount: monthlyRent,
      exemptionAmount: 0,
      taxableAmount: taxableRent,
      taxAmount: totalTax,
      annualTaxAmount: totalTax * 12,
      effectiveRate:
        monthlyRent > 0
          ? parseFloat(((totalTax / monthlyRent) * 100).toFixed(2))
          : 0,
      details: {
        expenseDeduction,
        residentialDiscount,
        isResidential,
        taxRate,
        year,
      },
    };
  }
}
