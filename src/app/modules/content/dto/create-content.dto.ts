import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ContentType, ContentVisibility } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateContentDto {
  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pageCount?: number;

  @IsOptional()
  @IsEnum(ContentVisibility)
  visibility?: ContentVisibility;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
