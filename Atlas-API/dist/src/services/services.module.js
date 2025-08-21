"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const eulen_client_service_1 = require("./eulen-client.service");
const rate_limiter_service_1 = require("./rate-limiter.service");
const limit_validation_service_1 = require("./limit-validation.service");
const email_service_1 = require("./email.service");
const transaction_cleanup_service_1 = require("./transaction-cleanup.service");
const user_limit_repository_1 = require("../repositories/user-limit.repository");
const prisma_module_1 = require("../prisma/prisma.module");
let ServicesModule = class ServicesModule {
};
exports.ServicesModule = ServicesModule;
exports.ServicesModule = ServicesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, schedule_1.ScheduleModule.forRoot()],
        providers: [
            eulen_client_service_1.EulenClientService,
            rate_limiter_service_1.RateLimiterService,
            limit_validation_service_1.LimitValidationService,
            email_service_1.EmailService,
            transaction_cleanup_service_1.TransactionCleanupService,
            user_limit_repository_1.UserLimitRepository,
        ],
        exports: [
            eulen_client_service_1.EulenClientService,
            rate_limiter_service_1.RateLimiterService,
            limit_validation_service_1.LimitValidationService,
            email_service_1.EmailService,
            transaction_cleanup_service_1.TransactionCleanupService,
            user_limit_repository_1.UserLimitRepository,
        ],
    })
], ServicesModule);
//# sourceMappingURL=services.module.js.map