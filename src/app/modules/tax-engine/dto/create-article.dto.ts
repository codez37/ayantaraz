import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TaxBook, TaxCategory } from '@prisma/client';

export class CreateArticleDto {
  @IsString()
  articleNumber!: string;

  @IsString()
  text!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notes?: string[];

  @IsString()
  @IsOptional()
  chapterTitle?: string;

  @IsEnum(TaxBook)
  book!: TaxBook;

  @IsEnum(TaxCategory)
  @IsOptional()
  category?: TaxCategory;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}
