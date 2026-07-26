import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ITaxCalculator,
  CalcResult,
} from './interfaces/tax-calculator.interface';
import { SalaryCalculator } from './calculators/salary-calculator';
import { RentalCalculator } from './calculators/rental-calculator';
import { InheritanceCalculator } from './calculators/inheritance-calculator';
import { TransferCalculator } from './calculators/transfer-calculator';
import { BusinessCalculator } from './calculators/business-calculator';
import { CorporateCalculator } from './calculators/corporate-calculator';
import { VatCalculator } from './calculators/vat-calculator';
import { PropertyCalculator } from './calculators/property-calculator';
import { IncidentalCalculator } from './calculators/incidental-calculator';
import { PenaltyCalculator } from './calculators/penalty-calculator';
import { VacantHomeCalculator } from './calculators/vacant-home-calculator';
import { LuxuryCarCalculator } from './calculators/luxury-car-calculator';

@Injectable()
export class TaxComputeEngineService {
  private readonly calculators = new Map<string, ITaxCalculator>();

  constructor(private readonly prisma: PrismaService) {
    this.registerCalculator(new SalaryCalculator(this.prisma));
    this.registerCalculator(new RentalCalculator(this.prisma));
    this.registerCalculator(new InheritanceCalculator());
    this.registerCalculator(new TransferCalculator());
    this.registerCalculator(new BusinessCalculator(this.prisma));
    this.registerCalculator(new CorporateCalculator());
    this.registerCalculator(new VatCalculator());
    this.registerCalculator(new PropertyCalculator(this.prisma));
    this.registerCalculator(new IncidentalCalculator(this.prisma));
    this.registerCalculator(new PenaltyCalculator());
    this.registerCalculator(new VacantHomeCalculator());
    this.registerCalculator(new LuxuryCarCalculator());
  }

  registerCalculator(calculator: ITaxCalculator): void {
    this.calculators.set(calculator.type, calculator);
  }

  async calculate(
    type: string,
    params: Record<string, unknown>,
  ): Promise<CalcResult> {
    const calculator = this.findCalculator(type);
    return calculator.calculate(params);
  }

  private findCalculator(type: string): ITaxCalculator {
    const direct = this.calculators.get(type);
    if (direct) return direct;

    for (const calculator of this.calculators.values()) {
      if (calculator.canHandle(type)) {
        return calculator;
      }
    }

    throw new NotFoundException(`No calculator found for type: ${type}`);
  }
}
