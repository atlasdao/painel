import {
	Injectable,
	ExecutionContext,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('custom-jwt') {
	constructor(
		private reflector: Reflector,
		private prisma: PrismaService,
	) {
		super();
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest();

		// Check for API Key first
		const apiKey = request.headers['x-api-key'];
		if (apiKey) {
			try {
				// Validate API key directly with database
				const users = await this.prisma.user.findMany({
					where: {
						apiKey: { not: null },
						isActive: true,
					},
				});

				for (const user of users) {
					if (user.apiKey) {
						const isValid = await bcrypt.compare(apiKey, user.apiKey);
						if (isValid) {
							request.user = {
								id: user.id,
								sub: user.id,
								email: user.email,
								username: user.username,
								roles: [user.role],
								scope: ['api'],
							};
							return true;
						}
					}
				}
			} catch (error) {
				// Continue to JWT validation if API key fails
			}
		}

		// If no API key, use the Passport JWT strategy
		return super.canActivate(context) as Promise<boolean>;
	}

	handleRequest(err: any, user: any, info: any) {
		if (err || !user) {
			throw err || new UnauthorizedException('Unauthorized access');
		}
		return user;
	}
}
