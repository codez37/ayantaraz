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

export class UpdateBracketDto {
  @IsInt()
  @Min(1300)
  @Max(1500)
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @IsEnum(BracketType)
  @IsOptional()
  type?: BracketType;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  bracketOrder?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  rate?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
