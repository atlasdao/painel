"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./jwt.strategy");
const external_jwt_strategy_1 = require("./external-jwt.strategy");
const rsa_jwt_strategy_1 = require("./rsa-jwt.strategy");
const custom_jwt_strategy_1 = require("./custom-jwt.strategy");
const user_repository_1 = require("../repositories/user.repository");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'custom-jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRATION', '24h'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            config_1.ConfigModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            external_jwt_strategy_1.ExternalJwtStrategy,
            rsa_jwt_strategy_1.RsaJwtStrategy,
            custom_jwt_strategy_1.CustomJwtStrategy,
            user_repository_1.UserRepository,
        ],
        exports: [auth_service_1.AuthService, passport_1.PassportModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map