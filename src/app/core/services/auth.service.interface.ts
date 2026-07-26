import { User } from '../domain/user.entity';

export interface IAuthService {
  // Password operations
  hashPassword(password: string): Promise<string>;
  validatePassword(password: string, hashedPassword: string): Promise<boolean>;

  // Token operations
  generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;

  refreshTokens(refreshToken: string): Promise<{
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }>;

  // Token validation
  validateAccessToken(token: string): Promise<{ sub: number; phone: string; role: string }>;
  validateRefreshToken(token: string): Promise<{ sub: number }>;

  // Token invalidation
  invalidateRefreshToken(token: string): Promise<void>;
  invalidateAllRefreshTokens(userId: number): Promise<void>;
}
