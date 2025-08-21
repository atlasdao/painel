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
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const base_repository_1 = require("./base.repository");
let UserRepository = class UserRepository extends base_repository_1.AbstractBaseRepository {
    prisma;
    model;
    constructor(prisma) {
        super(prisma);
        this.prisma = prisma;
        this.model = this.prisma.user;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findByUsername(username) {
        return this.prisma.user.findUnique({
            where: { username },
        });
    }
    async findByApiKey(apiKey) {
        return this.prisma.user.findUnique({
            where: { apiKey },
        });
    }
    async createWithRoles(data, roleIds) {
        return this.prisma.user.create({
            data: {
                ...data,
                role: data.role || client_1.UserRole.USER,
            },
        });
    }
    async updateLastLogin(id) {
        return this.prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    }
    async findActiveUsers(params) {
        return this.prisma.user.findMany({
            ...params,
            where: { isActive: true },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async findAll(params) {
        return this.prisma.user.findMany({
            ...params,
        });
    }
    async countNewUsersToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.user.count({
            where: {
                createdAt: {
                    gte: today,
                },
            },
        });
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserRepository);
//# sourceMappingURL=user.repository.js.map