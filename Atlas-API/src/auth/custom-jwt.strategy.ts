import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomJwtStrategy extends PassportStrategy(
	Strategy,
	'custom-jwt',
) {
	constructor(private readonly configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
		});
	}

	async validate(payload: any) {
		if (!payload || !payload.sub) {
			throw new UnauthorizedException('Invalid token payload');
		}

		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			throw new UnauthorizedException('Token has expired');
		}

		// Return user object with consistent structure
		return {
			id: payload.sub,
			sub: payload.sub,
			email: payload.email,
			username: payload.username,
			roles: payload.roles || [],
			role: payload.roles?.[0] || payload.role || 'USER',
			scope: payload.scope || ['web'],
		};
	}
}
