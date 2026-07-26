import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class TaxQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  sessionId?: string;
}
