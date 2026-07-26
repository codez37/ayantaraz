import { Injectable } from '@nestjs/common';
import {
  EntityExtractorService,
  ExtractedEntities,
} from './entity-extractor.service';
import { getSlotConfig, SlotDefinition } from './calc-slots';

export const CONFIDENCE_VERSION = 'v1.0.0';
export const CONFIDENCE_THRESHOLD = 70;
export const MAX_QUESTIONS_PER_RESPONSE = 3;

export interface FilledSlot {
  name: string;
  label: string;
  value: unknown;
  source: 'extracted' | 'inferred' | 'default';
}

export interface MissingSlot {
  name: string;
  label: string;
  prompt: string;
  examples: string[];
  weight: number;
}

export interface ExplainabilityData {
  detectedIntent: string;
  confidencePercent: number;
  extractedEntities: Record<string, unknown>;
  assumptions: string[];
}

export interface ConfidenceResult {
  score: number;
  calcType: string;
  isConfident: boolean;
  entities: ExtractedEntities;
  filledSlots: FilledSlot[];
  missingSlots: MissingSlot[];
  clarificationPrompt: string | null;
  explainability: ExplainabilityData;
  version: string;
}

@Injectable()
export class ConfidenceEngineService {
  constructor(private readonly entityExtractor: EntityExtractorService) {}

  evaluate(query: string, calcType: string): ConfidenceResult {
    const entities = this.entityExtractor.extract(query);
    const slotConfig = getSlotConfig(calcType);

    if (!slotConfig) {
      return this.buildNoSlotResult(query, calcType, entities);
    }

    const filledSlots: FilledSlot[] = [];
    const missingSlots: MissingSlot[] = [];
    let totalWeight = 0;
    let filledWeight = 0;

    for (const slot of slotConfig.slots) {
      totalWeight += slot.weight;
      const value = this.getSlotValue(entities, slot);

      if (value !== null && value !== undefined) {
        filledWeight += slot.weight;
        filledSlots.push({
          name: slot.name,
          label: slot.label,
          value,
          source: 'extracted',
        });
      } else if (slot.required) {
        missingSlots.push({
          name: slot.name,
          label: slot.label,
          prompt: slot.prompt,
          examples: slot.examples,
          weight: slot.weight,
        });
      }
    }

    const score =
      totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;

    const isConfident = score >= CONFIDENCE_THRESHOLD;

    // Anti-overasking: limit to MAX_QUESTIONS_PER_RESPONSE
    const prioritizedMissing = missingSlots
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_QUESTIONS_PER_RESPONSE);

    const clarificationPrompt = !isConfident
      ? this.buildClarificationPrompt(prioritizedMissing, filledSlots)
      : null;

    const explainability: ExplainabilityData = {
      detectedIntent: slotConfig.label,
      confidencePercent: score,
      extractedEntities: {
        amount: entities.amount,
        amountUnit: entities.amountUnit,
        year: entities.year,
        businessType: entities.businessType,
        businessCoefficient: entities.businessCoefficient,
        hasPartner: entities.hasPartner,
        partnerCount: entities.partnerCount,
        businessCode: entities.businessCode,
      },
      assumptions: this.buildAssumptions(entities, filledSlots, missingSlots),
    };

    return {
      score,
      calcType,
      isConfident,
      entities,
      filledSlots,
      missingSlots: prioritizedMissing,
      clarificationPrompt,
      explainability,
      version: CONFIDENCE_VERSION,
    };
  }

  private getSlotValue(
    entities: ExtractedEntities,
    slot: SlotDefinition,
  ): unknown {
    switch (slot.name) {
      case 'amount':
        return entities.amount;
      case 'year':
        return entities.year;
      case 'businessType':
        return entities.businessType;
      case 'hasPartner':
        return entities.hasPartner;
      case 'partnerCount':
        return entities.partnerCount;
      case 'businessCode':
        return entities.businessCode;
      case 'hasInsurance':
        return entities.hasInsurance;
      case 'hasDeductions':
        return entities.hasDeductions;
      case 'hasMortgage':
        return entities.hasMortgage;
      case 'isCommercial':
        return entities.isCommercial;
      case 'heirType':
        return entities.heirType;
      case 'propertyType':
        return entities.propertyType;
      case 'companyType':
        return entities.companyType;
      case 'transferType':
        return entities.transferType;
      case 'usage':
        return entities.usage;
      default:
        return null;
    }
  }

  private buildClarificationPrompt(
    missing: MissingSlot[],
    filled: FilledSlot[],
  ): string {
    const parts: string[] = [];
    parts.push('برای محاسبه دقیق به اطلاعات بیشتری نیاز دارم:\n');

    for (const slot of missing) {
      parts.push(`• ${slot.prompt}`);
      if (slot.examples.length > 0) {
        parts.push(`  مثال: ${slot.examples.slice(0, 2).join('، ')}`);
      }
    }

    if (filled.length > 0) {
      parts.push('\nاطلاعات تشخیص داده شده:');
      for (const slot of filled) {
        parts.push(`  ✓ ${slot.label}: ${slot.value}`);
      }
    }

    return parts.join('\n');
  }

  private buildAssumptions(
    entities: ExtractedEntities,
    _filled: FilledSlot[],
    missing: MissingSlot[],
  ): string[] {
    const assumptions: string[] = [];
    if (entities.amount && missing.some((s) => s.name === 'year')) {
      assumptions.push('سال مالیاتی فرضی: ۱۴۰۴ (سال جاری)');
    }
    if (entities.businessType && entities.businessCoefficient) {
      assumptions.push(
        `ضریب سود تشخیص داده شده: ${(entities.businessCoefficient * 100).toFixed(1)}%`,
      );
    }
    if (entities.amountUnit === 'تومان') {
      assumptions.push('مبلغ به تومان وارد شده، تبدیل به ریال شد');
    }
    return assumptions;
  }

  private buildNoSlotResult(
    _query: string,
    calcType: string,
    entities: ExtractedEntities,
  ): ConfidenceResult {
    return {
      score: 0,
      calcType,
      isConfident: false,
      entities,
      filledSlots: [],
      missingSlots: [],
      clarificationPrompt: 'برای این نوع محاسبه اطلاعات کافی وجود ندارد.',
      explainability: {
        detectedIntent: calcType,
        confidencePercent: 0,
        extractedEntities: {},
        assumptions: [],
      },
      version: CONFIDENCE_VERSION,
    };
  }
}
