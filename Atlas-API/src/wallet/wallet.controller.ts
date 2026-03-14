import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { WalletService } from './wallet.service';
import { WalletPriceService } from './wallet-price.service';
import { BroadcastTxDto } from './dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletPriceService: WalletPriceService,
  ) {}

  @Get('utxos/:address')
  @RateLimit(30, 60 * 1000)
  async getUtxos(@Param('address') address: string, @Req() req: any) {
    return this.walletService.getUtxos(address, req.user?.id || req.user?.sub);
  }

  @Get('transactions/:address')
  @RateLimit(20, 60 * 1000)
  async getTransactions(@Param('address') address: string, @Req() req: any) {
    return this.walletService.getTransactions(address, req.user?.id || req.user?.sub);
  }

  @Get('tx/:txid')
  @RateLimit(20, 60 * 1000)
  async getTransaction(@Param('txid') txid: string, @Req() req: any) {
    const hex = await this.walletService.getTransaction(txid, req.user?.id || req.user?.sub);
    return { hex };
  }

  @Post('broadcast')
  @RateLimit(5, 60 * 1000)
  async broadcast(@Body() dto: BroadcastTxDto, @Req() req: any) {
    const txid = await this.walletService.broadcast(dto.txHex, req.user?.id || req.user?.sub);
    return { txid };
  }

  @Get('asset/:assetId')
  @RateLimit(30, 60 * 1000)
  async getAssetInfo(@Param('assetId') assetId: string) {
    return this.walletService.getAssetInfo(assetId);
  }

  @Get('fee-estimate')
  @RateLimit(60, 60 * 1000)
  async getFeeEstimate() {
    return this.walletService.getFeeEstimate();
  }

  @Get('prices')
  @RateLimit(60, 60 * 1000)
  async getPrices() {
    return this.walletPriceService.getPrices();
  }
}
