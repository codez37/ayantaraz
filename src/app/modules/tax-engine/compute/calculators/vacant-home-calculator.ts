import { Injectable } from '@nestjs/common';
import {
  ITaxCalculator,
  CalcResult,
} from '../interfaces/tax-calculator.interface';

const DEDUCTION_PERCENT = 25;
const YEAR1_MULTIPLIER = 6;
const YEAR2_MULTIPLIER = 12;
const YEAR3_MULTIPLIER = 18;
const LARGE_OWNER_FACTOR = 2;

@Injectable()
export class VacantHomeCalculator implements ITaxCalculator {
  readonly type = 'VACANT_HOME';

  canHandle(calcType: string): boolean {
    return calcType === this.type;
  }

  calculate(params: Record<string, unknown>): Promise<CalcResult> {
    const monthlyRent = Number(params['rent']) || Number(params['amount']) || 0;
    const vacantYears = Number(params['vacantYears']) || 1;
    const hasMoreThan5Props = params['largeOwner'] === true;
    const monthsEmpty = Math.min(
      Math.max(Number(params['monthsEmpty']) || 12, 1),
      12,
    );

    if (monthlyRent < 0) {
      return Promise.reject(new Error('Rent amount cannot be negative'));
    }

    const afterDeduction =
      monthlyRent - (monthlyRent * DEDUCTION_PERCENT) / 100;
    const baseTaxMonthly = afterDeduction * 0.15;

    let yearMultiplier: number;
    const cappedYears = Math.min(vacantYears, 3);
    if (cappedYears === 1) yearMultiplier = YEAR1_MULTIPLIER;
    else if (cappedYears === 2) yearMultiplier = YEAR2_MULTIPLIER;
    else yearMultiplier = YEAR3_MULTIPLIER;

    if (hasMoreThan5Props) {
      yearMultiplier *= LARGE_OWNER_FACTOR;
    }

    const penaltyMonthly = baseTaxMonthly * (yearMultiplier - 1);
    const totalMonthlyTax = baseTaxMonthly * yearMultiplier;
    const totalAnnualTax = totalMonthlyTax * monthsEmpty;

    return Promise.resolve({
      type: this.type,
      grossAmount: monthlyRent * monthsEmpty,
      exemptionAmount: ((monthlyRent * DEDUCTION_PERCENT) / 100) * monthsEmpty,
      taxableAmount: afterDeduction * monthsEmpty,
      taxAmount: totalAnnualTax,
      effectiveRate:
        Math.round((totalAnnualTax / (monthlyRent * monthsEmpty)) * 100 * 100) /
        100,
      annualTaxAmount: totalAnnualTax,
      breakdown: [
        { range: 'اجاره ماهانه', rate: 0, taxable: 0, tax: 0 },
        {
          range: 'کسری ۲۵٪ هزینه',
          rate: DEDUCTION_PERCENT,
          taxable: monthlyRent * monthsEmpty,
          tax: ((monthlyRent * DEDUCTION_PERCENT) / 100) * monthsEmpty,
        },
        {
          range: `ضریب ${yearMultiplier} برابر`,
          rate: yearMultiplier * 15,
          taxable: afterDeduction * monthsEmpty,
          tax: totalAnnualTax,
        },
      ],
      details: {
        monthlyRent,
        afterDeduction,
        baseTaxMonthly,
        yearMultiplier,
        penaltyMonthly,
        monthsEmpty,
        hasMoreThan5Props,
        ref: 'ماده ۵۴ مکرر قانون مالیات‌های مستقیم',
      },
    });
  }
}
