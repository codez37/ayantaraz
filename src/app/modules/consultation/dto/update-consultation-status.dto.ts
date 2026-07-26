import { IsEnum, IsOptional, IsString, IsInt } from 'class-validator';
import { ConsultationStatus } from '@prisma/client';

export class UpdateConsultationStatusDto {
  @IsEnum(ConsultationStatus)
  status!: ConsultationStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsInt()
  assignedToId?: number;
}
