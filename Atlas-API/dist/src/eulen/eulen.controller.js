"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EulenController = void 0;
const common_1 = require("@nestjs/common");
const eulen_service_1 = require("./eulen.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const scope_guard_1 = require("../auth/guards/scope.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const scope_decorator_1 = require("../common/decorators/scope.decorator");
const eulen_dto_1 = require("./dto/eulen.dto");
let EulenController = class EulenController {
    eulenService;
    constructor(eulenService) {
        this.eulenService = eulenService;
    }
    async ping() {
        return this.eulenService.ping();
    }
    async deposit(depositDto) {
        return this.eulenService.deposit(depositDto);
    }
    async getDepositStatus(transactionId) {
        return this.eulenService.getDepositStatus(transactionId);
    }
};
exports.EulenController = EulenController;
__decorate([
    (0, common_1.Get)('ping'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EulenController.prototype, "ping", null);
__decorate([
    (0, common_1.Post)('deposit'),
    (0, scope_decorator_1.RequireScope)('deposit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eulen_dto_1.DepositDto]),
    __metadata("design:returntype", Promise)
], EulenController.prototype, "deposit", null);
__decorate([
    (0, common_1.Get)('deposit-status'),
    (0, scope_decorator_1.RequireScope)('deposit'),
    __param(0, (0, common_1.Query)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EulenController.prototype, "getDepositStatus", null);
exports.EulenController = EulenController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, scope_guard_1.ScopeGuard),
    __metadata("design:paramtypes", [eulen_service_1.EulenService])
], EulenController);
//# sourceMappingURL=eulen.controller.js.map