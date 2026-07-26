import { CalcResult } from '../../interfaces/calc-result.interface';

export interface ITaxCalculator {
  readonly type: string;
  canHandle(calcType: string): boolean;
  calculate(params: Record<string, unknown>): Promise<CalcResult>;
}

export type { CalcResult };
