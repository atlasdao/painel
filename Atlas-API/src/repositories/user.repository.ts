import { Injectable, Logger } from '@nestjs/common';
import { User, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends AbstractBaseRepository<User> {
	protected model: any;
	private readonly logger = new Logger(UserRepository.name);

	constructor(protected readonly prisma: PrismaService) {
		super(prisma);
		this.model = this.prisma.user;
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.prisma.user.findUnique({
			where: { email },
		});
	}

	async findByUsername(username: string): Promise<User | null> {
		return this.prisma.user.findUnique({
			where: { username },
		});
	}

	async findByApiKey(apiKey: string): Promise<User | null> {
		return this.prisma.user.findUnique({
			where: { apiKey },
		});
	}

	async createWithRoles(
		data: Prisma.UserCreateInput,
		roleIds: string[],
	): Promise<User> {
		return this.prisma.user.create({
			data: {
				...data,
				role: data.role || UserRole.USER,
			},
		});
	}

	async updateLastLogin(id: string): Promise<User> {
		return this.prisma.user.update({
			where: { id },
			data: { lastLoginAt: new Date() },
		});
	}

	async findActiveUsers(params?: {
		skip?: number;
		take?: number;
		orderBy?: Prisma.UserOrderByWithRelationInput;
	}): Promise<User[]> {
		return this.prisma.user.findMany({
			...params,
			where: { isActive: true },
		});
	}

	async findById(id: string): Promise<User | null> {
		this.logger.debug(`Finding user by ID: ${id}`);
		const user = await this.prisma.user.findUnique({
			where: { id },
		});

		if (user) {
			this.logger.debug(`User found:`, {
				id: user.id,
				email: user.email,
				hasProfilePicture: !!user.profilePicture,
				profilePictureLength: user.profilePicture?.length || 0,
				defaultWalletAddress: user.defaultWalletAddress,
				defaultWalletType: user.defaultWalletType,
				twoFactorEnabled: user.twoFactorEnabled,
			});
		} else {
			this.logger.debug(`User not found for ID: ${id}`);
		}

		return user;
	}

	async findAll(params?: {
		skip?: number;
		take?: number;
		orderBy?: Prisma.UserOrderByWithRelationInput;
	}): Promise<User[]> {
		return this.prisma.user.findMany({
			...params,
		});
	}

	async countNewUsersToday(): Promise<number> {
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
}
