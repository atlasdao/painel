import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FingerprintService } from './fingerprint.service';
import { IpAnalysisService } from './ip-analysis.service';
import { RiskScoringService } from './risk-scoring.service';
import { EuidValidationService } from './euid-validation.service';
import { BlockedEntityService } from './blocked-entity.service';
import { VisitorSessionService } from './visitor-session.service';
import { RiskController } from './risk.controller';

@Global()
@Module({
	imports: [PrismaModule],
	controllers: [RiskController],
	providers: [
		FingerprintService,
		IpAnalysisService,
		RiskScoringService,
		EuidValidationService,
		BlockedEntityService,
		VisitorSessionService,
	],
	exports: [
		FingerprintService,
		IpAnalysisService,
		RiskScoringService,
		EuidValidationService,
		BlockedEntityService,
		VisitorSessionService,
	],
})
export class RiskModule {}
