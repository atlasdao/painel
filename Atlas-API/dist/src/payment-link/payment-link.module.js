"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLinkModule = void 0;
const common_1 = require("@nestjs/common");
const payment_link_controller_1 = require("./payment-link.controller");
const public_payment_link_controller_1 = require("./public-payment-link.controller");
const payment_link_service_1 = require("./payment-link.service");
const prisma_module_1 = require("../prisma/prisma.module");
const pix_module_1 = require("../pix/pix.module");
let PaymentLinkModule = class PaymentLinkModule {
};
exports.PaymentLinkModule = PaymentLinkModule;
exports.PaymentLinkModule = PaymentLinkModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, pix_module_1.PixModule],
        controllers: [payment_link_controller_1.PaymentLinkController, public_payment_link_controller_1.PublicPaymentLinkController],
        providers: [payment_link_service_1.PaymentLinkService],
        exports: [payment_link_service_1.PaymentLinkService],
    })
], PaymentLinkModule);
//# sourceMappingURL=payment-link.module.js.map