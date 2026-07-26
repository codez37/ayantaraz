import { SearchResult } from './search-result.interface';
import { CalcResult } from './calc-result.interface';
import { ProcedureResult } from './procedure-result.interface';
import { ConfidenceResult } from '../confidence/confidence-engine.service';

export interface QueryResult {
  type: 'SEARCH' | 'CALC' | 'PROCEDURE' | 'UNKNOWN';
  status?: 'ok' | 'error' | 'partial';
  error?: string;
  answer?: string;
  results?: SearchResult[];
  computation?: CalcResult;
  procedure?: ProcedureResult;
  referencedArticles?: string[];
  confidence?: ConfidenceResult;
}
