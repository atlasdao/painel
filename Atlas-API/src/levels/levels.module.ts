import { Module } from '@nestjs/common';
import { LevelsService } from './levels.service';
import { LevelsController } from './levels.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BotSyncService } from '../common/services/bot-sync.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LevelsController],
  providers: [LevelsService, BotSyncService],
  exports: [LevelsService],
})
export class LevelsModule {}