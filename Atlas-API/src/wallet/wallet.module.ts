import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletPriceService } from './wallet-price.service';
import { CacheService } from '../common/services/cache.service';
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ServicesModule, AuthModule],
  controllers: [WalletController],
  providers: [WalletService, WalletPriceService, CacheService],
  exports: [WalletService],
})
export class WalletModule {}
