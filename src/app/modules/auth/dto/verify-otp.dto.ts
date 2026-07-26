import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'Phone must be a valid Iranian mobile number',
  })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be 6 digits' })
  code!: string;
}
