import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthService } from '../../services/auth.service.interface';
import { User } from '../../domain/user.entity';

interface RefreshTokenInput {
  refreshToken: string;
}

interface RefreshTokenOutput {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(private authService: IAuthService) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    try {
      const result = await this.authService.refreshTokens(input.refreshToken);
      return result;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
