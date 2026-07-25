import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import {
  TOKEN_ALGORITHM,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE_ACCESS,
} from './auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          if (request?.cookies?.accessToken) {
            return request.cookies.accessToken;
          }
          const authHeader = request?.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      algorithms: [TOKEN_ALGORITHM],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE_ACCESS,
    });
  }

  validate(payload: {
    sub: number;
    phone: string;
    role: string;
    iss?: string;
    aud?: string;
  }) {
    if (!payload.sub) {
      throw new UnauthorizedException('توکن نامعتبر است');
    }
    if (payload.iss !== TOKEN_ISSUER || payload.aud !== TOKEN_AUDIENCE_ACCESS) {
      throw new UnauthorizedException('توکن نامعتبر است');
    }
    return {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
    };
  }
}
