import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';
import { BracketType } from '@prisma/client';

export class UpdateRuleDto {
  @IsEnum(BracketType)
  @IsOptional()
  type?: BracketType;

  @IsString()
  @IsOptional()
  ruleKey?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  condition?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  action?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  effectiveFrom?: string;

  @IsString()
  @IsOptional()
  effectiveTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
