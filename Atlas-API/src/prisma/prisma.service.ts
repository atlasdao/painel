import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	constructor(private configService: ConfigService) {
		super({
			datasources: {
				db: {
					url: configService.get<string>('DATABASE_URL'),
				},
			},
			log:
				configService.get<string>('NODE_ENV') === 'development'
					? ['query', 'info', 'warn', 'error']
					: ['error'],
		});
	}

	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}

	async cleanDatabase() {
		if (this.configService.get('NODE_ENV') === 'production') {
			throw new Error('cleanDatabase is not allowed in production');
		}

		const models = Reflect.ownKeys(this).filter(
			(key) => key[0] !== '_' && key[0] !== '$' && key !== 'constructor',
		);

		return Promise.all(
			models.map((modelKey) => {
				const model = this[modelKey as string];
				if (model && typeof model.deleteMany === 'function') {
					return model.deleteMany();
				}
				return null;
			}),
		);
	}
}
