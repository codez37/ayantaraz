import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

interface PropertyEntry {
  type: 'residential' | 'commercial' | 'vacant';
  value: number;
}

@Injectable()
export class PropertyCalculator implements ITaxCalculator {
  readonly type = 'PROPERTY';

  constructor(private readonly prisma: PrismaService) {}

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  async calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const properties = params['properties'] as PropertyEntry[];
    const year = Number(params['year']) || 1403;

    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      throw new Error('Properties array is required');
    }

    const bracket = await this.prisma.taxBracket.findFirst({
      where: { year, type: 'PROPERTY' },
      orderBy: { bracketOrder: 'asc' },
    });

    const baseRate = bracket ? bracket.rate : 0.5;
    const typeMultipliers: Record<string, number> = {
      residential: 1,
      commercial: 1.5,
      vacant: 2,
    };

    let totalValue = 0;
    let totalTax = 0;
    const items: Array<{
      type: string;
      value: number;
      rate: number;
      tax: number;
    }> = [];

    for (const prop of properties) {
      const multiplier = typeMultipliers[prop.type] || 1;
      const rate = baseRate * multiplier;
      const tax = (prop.value * rate) / 100;

      totalValue += prop.value;
      totalTax += tax;
      items.push({ type: prop.type, value: prop.value, rate, tax });
    }

    return {
      type: this.type,
      grossAmount: totalValue,
      exemptionAmount: 0,
      taxableAmount: totalValue,
      taxAmount: totalTax,
      effectiveRate:
        totalValue > 0
          ? parseFloat(((totalTax / totalValue) * 100).toFixed(2))
          : 0,
      details: { properties: items, baseRate, year },
    };
  }
}
