import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
