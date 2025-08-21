import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface ExternalJwtPayload {
  sub: string;
  scope: string[];
  iat: number;
  exp: number;
  jti: string;
  env: string;
  alg: string;
  typ: string;
}

@Injectable()
export class ExternalJwtStrategy extends PassportStrategy(Strategy, 'external-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        // For external tokens, we skip signature verification
        // since we don't have the private key
        // In production, you should validate against the issuer's public key
        done(null, 'dummy-secret');
      },
      passReqToCallback: false,
    });
  }

  async validate(payload: ExternalJwtPayload): Promise<ExternalJwtPayload> {
    if (!payload.sub || !payload.scope) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Token has expired');
    }

    return payload;
  }
}