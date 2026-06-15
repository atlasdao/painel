import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityVaultController } from './identity-vault.controller';
import { IdentityVaultService } from './identity-vault.service';

@Global()
@Module({
	imports: [PrismaModule],
	controllers: [IdentityVaultController],
	providers: [IdentityVaultService],
	exports: [IdentityVaultService],
})
export class IdentityVaultModule {}
