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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const scope_decorator_1 = require("../../common/decorators/scope.decorator");
let ScopeGuard = class ScopeGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredScopes = this.reflector.get(scope_decorator_1.SCOPE_KEY, context.getHandler());
        const oldScope = this.reflector.get('scope', context.getHandler());
        if (!requiredScopes && !oldScope) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        if (requiredScopes) {
            const userRole = user.role || user.roles?.[0];
            if (!userRole || !requiredScopes.includes(userRole)) {
                throw new common_1.ForbiddenException(`Required role: ${requiredScopes.join(' or ')}`);
            }
            return true;
        }
        if (oldScope && user.scope) {
            if (user.scope !== oldScope && user.role !== oldScope) {
                throw new common_1.ForbiddenException(`Required scope: ${oldScope}`);
            }
        }
        return true;
    }
};
exports.ScopeGuard = ScopeGuard;
exports.ScopeGuard = ScopeGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], ScopeGuard);
//# sourceMappingURL=scope.guard.js.map