import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ConsultationType } from '@prisma/client';

export class CreateConsultationDto {
  @IsOptional()
  @IsEnum(ConsultationType)
  subject?: ConsultationType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  requestType?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

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
  @MaxLength(200)
  preferredTime?: string;
}
