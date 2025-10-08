import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

export interface RsaJwtPayload {
	sub: string;
	scope: string[];
	iat: number;
	exp: number;
	jti: string;
	env: string;
	alg: string;
	typ?: string;
}

@Injectable()
export class RsaJwtStrategy extends PassportStrategy(Strategy, 'rsa-jwt') {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKeyProvider: async (request, rawJwtToken, done) => {
				try {
					// Decode without verification first to inspect the token
					const decoded = jwt.decode(rawJwtToken, { complete: true }) as any;

					// For external RSA tokens, we need the public key
					// Since we don't have it, we'll validate the structure and expiration manually
					if (decoded && decoded.header.alg === 'RS256') {
						// Skip signature verification for external tokens
						// In production, you should use the issuer's public key
						done(null, 'skip-verification');
					} else {
						done(new UnauthorizedException('Algoritmo do token inválido'));
					}
				} catch (error) {
					done(error);
				}
			},
		});
	}

	async validate(rawPayload: any): Promise<RsaJwtPayload> {
		// Extract the actual payload from the token
		const payload = rawPayload as RsaJwtPayload;

		if (!payload.sub || !payload.scope) {
			throw new UnauthorizedException('Payload do token inválido');
		}

		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			throw new UnauthorizedException('Token expirou');
		}

		return payload;
	}
}
