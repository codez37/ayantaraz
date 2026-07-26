import { IsString } from 'class-validator';

export class ResetSessionDto {
  @IsString()
  sessionId!: string;
}
