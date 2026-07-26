import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RiskLevel } from '@prisma/client';

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
