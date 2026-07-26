import { Injectable } from '@nestjs/common';
import { normalizePersian } from '../search/normalizer';
import {
  SEARCH_PATTERNS,
  CALC_PATTERNS,
  PROCEDURE_PATTERNS,
} from './query-patterns';

type QueryType = 'SEARCH' | 'CALC' | 'PROCEDURE' | 'UNKNOWN';

interface Pattern {
  pattern: RegExp;
  priority: number;
}

@Injectable()
export class QueryRouterService {
  detect(input: string): QueryType {
    const text = normalizePersian(input);

    const scoreSEARCH = this.matchPatterns(text, SEARCH_PATTERNS);
    const scoreCALC = this.matchPatterns(text, CALC_PATTERNS);
    const scorePROCEDURE = this.matchPatterns(text, PROCEDURE_PATTERNS);

    if (scoreSEARCH > scoreCALC && scoreSEARCH > scorePROCEDURE) {
      return 'SEARCH';
    }
    if (scoreCALC > scoreSEARCH && scoreCALC > scorePROCEDURE) {
      return 'CALC';
    }
    if (scorePROCEDURE > scoreSEARCH && scorePROCEDURE > scoreCALC) {
      return 'PROCEDURE';
    }
    if (scoreSEARCH > 0 || scoreCALC > 0 || scorePROCEDURE > 0) {
      if (scoreSEARCH >= scoreCALC && scoreSEARCH >= scorePROCEDURE) {
        return 'SEARCH';
      }
      if (scoreCALC >= scoreSEARCH && scoreCALC >= scorePROCEDURE) {
        return 'CALC';
      }
      return 'PROCEDURE';
    }
    return 'UNKNOWN';
  }

  private matchPatterns(text: string, patterns: Pattern[]): number {
    let score = 0;
    for (const { pattern, priority } of patterns) {
      if (pattern.test(text)) {
        score += priority === 1 ? 3 : 1;
      }
    }
    return score;
  }
}
