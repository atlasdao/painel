"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const eulen_module_1 = require("./eulen/eulen.module");
const pix_module_1 = require("./pix/pix.module");
const admin_module_1 = require("./admin/admin.module");
const api_key_request_module_1 = require("./api-key-request/api-key-request.module");
const payment_link_module_1 = require("./payment-link/payment-link.module");
const account_validation_module_1 = require("./account-validation/account-validation.module");
const withdrawals_module_1 = require("./withdrawals/withdrawals.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const prisma_module_1 = require("./prisma/prisma.module");
const services_module_1 = require("./services/services.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const audit_interceptor_1 = require("./common/interceptors/audit.interceptor");
const user_repository_1 = require("./repositories/user.repository");
const transaction_repository_1 = require("./repositories/transaction.repository");
const audit_log_repository_1 = require("./repositories/audit-log.repository");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            prisma_module_1.PrismaModule,
            services_module_1.ServicesModule,
            auth_module_1.AuthModule,
            eulen_module_1.EulenModule,
            pix_module_1.PixModule,
            admin_module_1.AdminModule,
            api_key_request_module_1.ApiKeyRequestModule,
            payment_link_module_1.PaymentLinkModule,
            account_validation_module_1.AccountValidationModule,
            withdrawals_module_1.WithdrawalsModule,
            webhooks_module_1.WebhooksModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            user_repository_1.UserRepository,
            transaction_repository_1.TransactionRepository,
            audit_log_repository_1.AuditLogRepository,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: audit_interceptor_1.AuditInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map