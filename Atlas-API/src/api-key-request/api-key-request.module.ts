import { Module } from '@nestjs/common';
import { ApiKeyRequestController } from './api-key-request.controller';
import { ApiKeyRequestService } from './api-key-request.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [ApiKeyRequestController],
	providers: [ApiKeyRequestService],
	exports: [ApiKeyRequestService],
})
export class ApiKeyRequestModule {}
