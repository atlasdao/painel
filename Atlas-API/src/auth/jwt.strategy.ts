import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
	sub: string;
	email?: string;
	username?: string;
	roles?: string[];
	role?: string;
	scope?: string[];
	exp?: number;
	iat?: number;
	type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
		});
	}

	async validate(payload: JwtPayload): Promise<any> {
		if (!payload.sub) {
			throw new UnauthorizedException('Invalid token payload');
		}

		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			throw new UnauthorizedException('Token has expired');
		}

		// Return user object with role information
		return {
			id: payload.sub,
			email: payload.email,
			username: payload.username,
			roles: payload.roles || [],
			role: payload.roles?.[0] || 'user', // Use first role from array
			scope: payload.scope,
		};
	}
}
