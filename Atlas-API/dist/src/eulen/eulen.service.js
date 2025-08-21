"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EulenService = void 0;
const common_1 = require("@nestjs/common");
let EulenService = class EulenService {
    async ping() {
        return {
            status: 'ok',
            timestamp: new Date(),
        };
    }
    async deposit(depositDto) {
        return {
            id: `TXN-${Date.now()}`,
            type: 'DEPOSIT',
            status: 'PENDING',
            amount: depositDto.amount,
            pixKey: depositDto.pixKey,
            externalId: depositDto.externalId,
            description: depositDto.description,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async getDepositStatus(transactionId) {
        return {
            id: transactionId,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: 100.00,
            pixKey: 'example@pix.com',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
};
exports.EulenService = EulenService;
exports.EulenService = EulenService = __decorate([
    (0, common_1.Injectable)()
], EulenService);
//# sourceMappingURL=eulen.service.js.map