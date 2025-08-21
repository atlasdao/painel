import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CustomJwtStrategy extends PassportStrategy(Strategy, 'custom-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        // Decode token without verification
        const decoded = jwt.decode(rawJwtToken, { complete: false });
        // For external tokens, skip verification
        done(null, 'dummy-secret');
      },
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    // Token has already been decoded, just validate the payload structure
    if (!payload || !payload.sub || !payload.scope) {
      return null;
    }

    // Check expiration manually
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  }
}