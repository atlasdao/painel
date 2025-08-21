"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PixModule = void 0;
const common_1 = require("@nestjs/common");
const pix_controller_1 = require("./pix.controller");
const pix_service_1 = require("./pix.service");
const transaction_repository_1 = require("../repositories/transaction.repository");
const audit_log_repository_1 = require("../repositories/audit-log.repository");
const auth_module_1 = require("../auth/auth.module");
const prisma_module_1 = require("../prisma/prisma.module");
const services_module_1 = require("../services/services.module");
let PixModule = class PixModule {
};
exports.PixModule = PixModule;
exports.PixModule = PixModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, prisma_module_1.PrismaModule, services_module_1.ServicesModule],
        controllers: [pix_controller_1.PixController],
        providers: [
            pix_service_1.PixService,
            transaction_repository_1.TransactionRepository,
            audit_log_repository_1.AuditLogRepository,
        ],
        exports: [pix_service_1.PixService],
    })
], PixModule);
//# sourceMappingURL=pix.module.js.map