import { Injectable, ConflictException } from '@nestjs/common';
import { IUserRepository } from '../../repositories/user.repository.interface';
import { IAuthService } from '../../services/auth.service.interface';
import { User } from '../../domain/user.entity';
import { UserRole } from '@prisma/client';

interface RegisterInput {
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface RegisterOutput {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    // Check if user already exists
    const phoneExists = await this.userRepository.existsByPhone(input.phone);
    if (phoneExists) {
      throw new ConflictException('User with this phone number already exists');
    }

    if (input.email) {
      const emailExists = await this.userRepository.existsByEmail(input.email);
      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(input.password);

    // Create user
    const user = await this.userRepository.create({
      ...input,
      password: hashedPassword,
      role: UserRole.user,
    });

    // Generate tokens
    const tokens = await this.authService.generateTokens(user);

    return { user, tokens };
  }
}
