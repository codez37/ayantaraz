import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TaxBook, TaxCategory } from '@prisma/client';

export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  articleNumber?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notes?: string[];

  @IsString()
  @IsOptional()
  chapterTitle?: string;

  @IsEnum(TaxBook)
  @IsOptional()
  book?: TaxBook;

  @IsEnum(TaxCategory)
  @IsOptional()
  category?: TaxCategory;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}
