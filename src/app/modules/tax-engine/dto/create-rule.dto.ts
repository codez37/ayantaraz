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

export class CreateRuleDto {
  @IsEnum(BracketType)
  type!: BracketType;

  @IsString()
  ruleKey!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  condition!: Record<string, unknown>;

  @IsObject()
  action!: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsString()
  effectiveFrom!: string;

  @IsString()
  @IsOptional()
  effectiveTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
