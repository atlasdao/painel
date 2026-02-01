import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorService } from './collaborator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../services/email.service';

@Module({
	imports: [
		PrismaModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET'),
				signOptions: {
					expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
				},
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [CollaboratorController],
	providers: [CollaboratorService, EmailService],
	exports: [CollaboratorService],
})
export class CollaboratorModule {}
