import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SMS_API_KEY!: string;

  @IsString()
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS!: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL!: string;

  @IsString()
  @IsOptional()
  FILE_ENCRYPTION_KEY!: string;

  @IsString()
  @IsOptional()
  SESSION_SECRET!: string;

  @IsString()
  @IsOptional()
  CAPTCHA_SECRET!: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: true,
  });

  if (errors.length > 0) {
    const msg = errors
      .map((e) => Object.values(e.constraints || {}).join(', '))
      .join('\n');

    throw new Error(`ENV_VALIDATION_FAILED:\n${msg}`);
  }

  return validated;
}
