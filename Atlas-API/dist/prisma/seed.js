"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@atlas.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    let adminUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: adminEmail },
                { username: 'admin' }
            ]
        }
    });
    if (adminUser) {
        adminUser = await prisma.user.update({
            where: { id: adminUser.id },
            data: {
                email: adminEmail,
                username: 'admin',
                password: adminHashedPassword,
                role: 'ADMIN',
            },
        });
    }
    else {
        adminUser = await prisma.user.create({
            data: {
                email: adminEmail,
                username: 'admin',
                password: adminHashedPassword,
                role: 'ADMIN',
            },
        });
    }
    const testUserPassword = await bcrypt.hash('user123', 10);
    const testUser = await prisma.user.upsert({
        where: { email: 'user@atlas.com' },
        update: {},
        create: {
            email: 'user@atlas.com',
            username: 'testuser',
            password: testUserPassword,
            role: 'USER',
        },
    });
    console.log('Seed completed:');
    console.log('- Admin user created:', adminUser);
    console.log('- Test user created:', testUser);
    console.log('\nCredentials:');
    console.log(`Admin - Email: ${adminEmail}, Password: ${adminPassword}`);
    console.log('User - Email: user@atlas.com, Password: user123');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map