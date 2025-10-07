import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRepository } from '../repositories/user.repository';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Module({
	imports: [PrismaModule, ConfigModule],
	controllers: [ProfileController],
	providers: [ProfileService, UserRepository, EncryptionUtil],
	exports: [ProfileService],
})
export class ProfileModule {}
