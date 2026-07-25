import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PhoneNormalizationPipe } from '../security/phone-normalization.pipe';
import { RateLimitTier } from '../security/decorators';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SecurityGuard } from '../security/security.guard';
import type { Request, Response } from 'express';

interface CookieRequest extends Request {
  cookies: Record<string, string>;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(SecurityGuard)
  @RateLimitTier('otp')
  @Post('otp')
  @HttpCode(200)
  @UsePipes(
    new ValidationPipe({ whitelist: true, transform: true }),
    PhoneNormalizationPipe,
  )
  async requestOtp(@Body() dto: RequestOtpDto): Promise<{ message: string }> {
    return this.authService.requestOtp(dto.phone);
  }

  @Public()
  @UseGuards(SecurityGuard)
  @RateLimitTier('auth')
  @Post('verify')
  @HttpCode(200)
  @UsePipes(
    new ValidationPipe({ whitelist: true, transform: true }),
    PhoneNormalizationPipe,
  )
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.verifyOtp(
      dto.phone,
      dto.code,
      req.ip,
      req.headers['user-agent'],
      res,
    );
    return user;
  }

  @Public()
  @UseGuards(SecurityGuard)
  @RateLimitTier('auth')
  @Post('refresh')
  @HttpCode(200)
  async refreshTokens(
    @Body() body: { refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.refreshToken) {
      throw new HttpException(
        'Refresh token is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.authService.refreshTokens(body.refreshToken, res);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser() user: { id: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id, res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @HttpCode(200)
  async getSessionInfo(@CurrentUser() user: { id: number }) {
    return this.authService.getSessionInfo(user.id);
  }
}
