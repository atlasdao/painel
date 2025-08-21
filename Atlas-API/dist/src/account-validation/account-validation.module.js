"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountValidationModule = void 0;
const common_1 = require("@nestjs/common");
const account_validation_controller_1 = require("./account-validation.controller");
const account_validation_service_1 = require("./account-validation.service");
const prisma_module_1 = require("../prisma/prisma.module");
const pix_module_1 = require("../pix/pix.module");
let AccountValidationModule = class AccountValidationModule {
};
exports.AccountValidationModule = AccountValidationModule;
exports.AccountValidationModule = AccountValidationModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, pix_module_1.PixModule],
        controllers: [account_validation_controller_1.AccountValidationController],
        providers: [account_validation_service_1.AccountValidationService],
        exports: [account_validation_service_1.AccountValidationService],
    })
], AccountValidationModule);
//# sourceMappingURL=account-validation.module.js.map