export interface BreakdownEntry {
  range: string;
  rate: number;
  taxable: number;
  tax: number;
}

export interface CalcResult {
  type: string;
  grossAmount: number;
  exemptionAmount?: number;
  taxableAmount: number;
  taxAmount: number;
  annualTaxAmount?: number;
  effectiveRate: number;
  breakdown?: BreakdownEntry[];
  details?: Record<string, unknown>;
}
