import { randomUUID } from 'crypto';

export interface AuditData {
  calcType?: string;
  inputs?: Record<string, unknown>;
  rulesApplied?: string[];
  articleRefs?: string[];
  finalFormula?: string;
  result?: Record<string, unknown>;
  confidence?: { score: number; version: string };
}

export function createAuditEntry(data: AuditData): { id: string; data: AuditData } {
  return {
    id: randomUUID(),
    data,
  };
}
