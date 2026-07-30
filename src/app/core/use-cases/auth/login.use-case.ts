import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from '../../repositories/user.repository.interface';
import { IAuthService } from '../../services/auth.service.interface';
import { User } from '../../domain/user.entity';

interface LoginInput {
  phone: string;
  password: string;
}

interface LoginOutput {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // Find user by phone
    const user = await this.userRepository.findByPhone(input.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Validate password
    const isPasswordValid = await this.authService.validatePassword(
      input.password,
      user.password ?? '',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.authService.generateTokens(user);

    return { user, tokens };
  }
}
