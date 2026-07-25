import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('IR')
  phone!: string;
}
