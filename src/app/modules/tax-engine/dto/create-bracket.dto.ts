import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BracketType } from '@prisma/client';

export class CreateBracketDto {
  @IsInt()
  @Min(1300)
  @Max(1500)
  @Type(() => Number)
  year!: number;

  @IsEnum(BracketType)
  type!: BracketType;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  bracketOrder!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rate!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
