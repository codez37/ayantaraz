import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_TIER_KEY } from './security.guard';

export const RateLimitTier = (tier: string) =>
  SetMetadata(RATE_LIMIT_TIER_KEY, tier);
