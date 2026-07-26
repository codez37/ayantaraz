import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  courseId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  itemId?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^09[0-9]{9}$/, { message: 'شماره تلفن نامعتبر است' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^09[0-9]{9}$/, { message: 'شماره تلفن نامعتبر است' })
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
