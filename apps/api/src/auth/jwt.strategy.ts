// apps/api/src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    console.log('JWT Strategy Initializing with Secret:', !!process.env.JWT_SECRET);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Strict requirement
    });
  }

  async validate(payload: any) {
    // If the token is valid, this payload is injected into req.user
    // We return exactly what the rest of the app needs for RBAC
    return { 
      id: payload.sub, 
      email: payload.email, 
      role: payload.role, 
      lender_id: payload.lender_id,
      permissions: payload.permissions 
    };
  }
}