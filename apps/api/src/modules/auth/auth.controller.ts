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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PhoneNormalizationPipe } from '../security/phone-normalization.pipe';
import { RateLimitTier } from '../security/decorators';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import type { Request, Response } from 'express';

interface CookieRequest extends Request {
  cookies: Record<string, string>;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @RateLimitTier('auth')
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
  @RateLimitTier('auth')
  @Post('verify')
  @HttpCode(200)
  @UsePipes(
    new ValidationPipe({ whitelist: true, transform: true }),
    PhoneNormalizationPipe,
  )
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const deviceInfo = req.headers['user-agent'];
    return this.authService.verifyOtp(dto.phone, dto.code, ip, deviceInfo, res);
  }

  @Public()
  @RateLimitTier('auth')
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new Error('ریفرش توکن یافت نشد');
    }
    const { tokens } = await this.authService.refreshTokens(refreshToken, res);
    return {
      message: 'توکن‌ها به‌روزرسانی شدند',
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser('id') userId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, res);
    return { message: 'خروج با موفقیت انجام شد' };
  }

  @Get('session')
  async session(@CurrentUser('id') userId: number) {
    return this.authService.getSessionInfo(userId);
  }
}
