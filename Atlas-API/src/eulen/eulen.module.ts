import { Module } from '@nestjs/common';
import { EulenController } from './eulen.controller';
import { EulenService } from './eulen.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EulenController],
  providers: [EulenService],
})
export class EulenModule {}