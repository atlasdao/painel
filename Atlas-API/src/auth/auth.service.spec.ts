import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
	ConflictException,
	UnauthorizedException,
	NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
	let service: AuthService;
	let userRepository: jest.Mocked<UserRepository>;
	let jwtService: jest.Mocked<JwtService>;
	let configService: jest.Mocked<ConfigService>;

	const testDepixAddress =
		'VJLCguHZDUbpy94zodwcvvUJgTxoLgjiMH8TfTwuYMUEzfMKwE2Ssu6J3LtWwtZUthoMq8HqEYhRm6Ff';

	const mockUser = {
		id: 'test-user-id',
		email: 'test@atlasdao.info',
		username: 'testuser',
		password: 'hashed_password',
		apiKey: null,
		apiKeyName: null,
		apiKeyExpiresAt: null,
		roles: ['user'],
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		lastLoginAt: null,
		deletedAt: null,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: UserRepository,
					useValue: {
						findByEmail: jest.fn(),
						findByUsername: jest.fn(),
						findByEmailOrUsername: jest.fn(),
						findById: jest.fn(),
						findByApiKey: jest.fn(),
						create: jest.fn(),
						createWithRoles: jest.fn(),
						update: jest.fn(),
						count: jest.fn(),
						createAuditLog: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						sign: jest.fn(),
						verify: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
		jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
		configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

		// Setup default mocks
		(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
		(bcrypt.compare as jest.Mock).mockResolvedValue(true);
		configService.get.mockImplementation((key: string) => {
			const config = {
				JWT_SECRET: 'test-jwt-secret',
				JWT_EXPIRES_IN: '24h',
				JWT_REFRESH_SECRET: 'test-refresh-secret',
				JWT_REFRESH_EXPIRES_IN: '7d',
				NODE_ENV: 'test',
			};
			return config[key];
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('register', () => {
		it('should register a new user with real DePix address', async () => {
			const registerDto = {
				email: 'newuser@atlasdao.info',
				username: 'newatlasuser',
				password: 'AtlasDAO2025!',
			};

			userRepository.findByEmailOrUsername.mockResolvedValue(null);
			userRepository.create.mockResolvedValue({
				...mockUser,
				id: 'new-user-id',
				email: registerDto.email,
				username: registerDto.username,
			});
			jwtService.sign
				.mockReturnValueOnce('test_access_token')
				.mockReturnValueOnce('test_refresh_token');

			const result = await service.register(registerDto);

			expect(result).toHaveProperty('accessToken', 'test_access_token');
			expect(result).toHaveProperty('refreshToken', 'test_refresh_token');
			expect(result).toHaveProperty('user');
			expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
			expect(userRepository.create).toHaveBeenCalled();
		});

		it('should throw ConflictException if email already exists', async () => {
			const registerDto = {
				email: 'existing@atlasdao.info',
				username: 'newuser',
				password: 'Password123!',
			};

			userRepository.findByEmailOrUsername.mockResolvedValue(mockUser);

			await expect(service.register(registerDto)).rejects.toThrow(
				ConflictException,
			);
		});
	});

	describe('login', () => {
		it('should login with email successfully', async () => {
			const loginDto = {
				emailOrUsername: 'test@atlasdao.info',
				password: 'AtlasDAO2025!',
			};

			userRepository.findByEmailOrUsername.mockResolvedValue(mockUser);
			jwtService.sign
				.mockReturnValueOnce('access_token')
				.mockReturnValueOnce('refresh_token');

			const result = await service.login(loginDto);

			expect(result).toHaveProperty('accessToken', 'access_token');
			expect(result).toHaveProperty('refreshToken', 'refresh_token');
			expect(bcrypt.compare).toHaveBeenCalledWith(
				loginDto.password,
				mockUser.password,
			);
			expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
				lastLoginAt: expect.any(Date),
			});
		});

		it('should throw UnauthorizedException for invalid credentials', async () => {
			const loginDto = {
				emailOrUsername: 'test@atlasdao.info',
				password: 'WrongPassword',
			};

			userRepository.findByEmailOrUsername.mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(service.login(loginDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it('should throw UnauthorizedException for non-existent user', async () => {
			const loginDto = {
				emailOrUsername: 'nonexistent@atlasdao.info',
				password: 'Password123',
			};

			userRepository.findByEmailOrUsername.mockResolvedValue(null);

			await expect(service.login(loginDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it('should throw UnauthorizedException for inactive user', async () => {
			const loginDto = {
				emailOrUsername: 'test@atlasdao.info',
				password: 'Password123',
			};

			userRepository.findByEmailOrUsername.mockResolvedValue({
				...mockUser,
				isActive: false,
			});

			await expect(service.login(loginDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});
	});

	describe('generateApiToken', () => {
		it('should generate API token for DePix transactions', async () => {
			const createApiKeyDto = {
				name: 'DePix Integration Key',
				expirationDays: 30,
			};

			userRepository.findById.mockResolvedValue(mockUser);
			userRepository.update.mockResolvedValue({
				...mockUser,
				apiKey: 'sk_live_depix_key_123',
				apiKeyName: createApiKeyDto.name,
				apiKeyExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			});

			const result = await service.generateApiToken(
				mockUser.id,
				createApiKeyDto,
			);

			expect(result).toHaveProperty('apiKey');
			expect(result.apiKey).toContain('sk_');
			expect(result).toHaveProperty('name', createApiKeyDto.name);
			expect(result).toHaveProperty('expiresAt');
		});

		it('should throw NotFoundException for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.generateApiToken('invalid-id', {})).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('validateUser', () => {
		it('should validate user by ID successfully', async () => {
			userRepository.findById.mockResolvedValue(mockUser);

			const result = await service.validateUser(mockUser.id);

			expect(result).toEqual(mockUser);
			expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
		});

		it('should return null for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			const result = await service.validateUser('invalid-id');

			expect(result).toBeNull();
		});
	});

	describe('validateApiKey', () => {
		it('should validate API key for DePix operations', async () => {
			const apiKey = 'sk_live_depix_valid_key';
			const userWithApiKey = {
				...mockUser,
				apiKey,
				apiKeyExpiresAt: new Date(Date.now() + 86400000), // 1 day from now
			};

			userRepository.findByApiKey.mockResolvedValue(userWithApiKey);

			const result = await service.validateApiKey(apiKey);

			expect(result).toEqual(userWithApiKey);
		});

		it('should return null for expired API key', async () => {
			const apiKey = 'sk_test_expired_key';
			const userWithExpiredKey = {
				...mockUser,
				apiKey,
				apiKeyExpiresAt: new Date(Date.now() - 86400000), // 1 day ago
			};

			userRepository.findByApiKey.mockResolvedValue(userWithExpiredKey);

			const result = await service.validateApiKey(apiKey);

			expect(result).toBeNull();
		});

		it('should return null for invalid API key', async () => {
			userRepository.findByApiKey.mockResolvedValue(null);

			const result = await service.validateApiKey('invalid_key');

			expect(result).toBeNull();
		});
	});

	describe('refreshAccessToken', () => {
		it('should refresh access token successfully', async () => {
			const refreshToken = 'valid_refresh_token';
			const payload = {
				sub: mockUser.id,
				email: mockUser.email,
				username: mockUser.username,
			};

			jwtService.verify.mockReturnValue(payload);
			userRepository.findById.mockResolvedValue(mockUser);
			jwtService.sign
				.mockReturnValueOnce('new_access_token')
				.mockReturnValueOnce('new_refresh_token');

			const result = await service.refreshAccessToken(refreshToken);

			expect(result).toHaveProperty('accessToken', 'new_access_token');
			expect(result).toHaveProperty('refreshToken', 'new_refresh_token');
			expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
				secret: 'test-refresh-secret',
			});
		});

		it('should throw UnauthorizedException for invalid refresh token', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			await expect(service.refreshAccessToken('invalid_token')).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it('should throw UnauthorizedException for non-existent user', async () => {
			const payload = {
				sub: 'non-existent-id',
				email: 'test@atlasdao.info',
				username: 'testuser',
			};

			jwtService.verify.mockReturnValue(payload);
			userRepository.findById.mockResolvedValue(null);

			await expect(service.refreshAccessToken('valid_token')).rejects.toThrow(
				UnauthorizedException,
			);
		});
	});

	describe('validateToken', () => {
		it('should validate JWT token successfully', async () => {
			const token = 'valid_jwt_token';
			const payload = {
				sub: mockUser.id,
				email: mockUser.email,
				username: mockUser.username,
			};

			jwtService.verify.mockReturnValue(payload);

			const result = await service.validateToken(token);

			expect(result).toEqual(payload);
			expect(jwtService.verify).toHaveBeenCalledWith(token);
		});

		it('should throw UnauthorizedException for invalid token', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			await expect(service.validateToken('invalid_token')).rejects.toThrow(
				UnauthorizedException,
			);
		});
	});

	describe('revokeApiKey', () => {
		it('should revoke API key successfully', async () => {
			userRepository.findById.mockResolvedValue(mockUser);
			userRepository.update.mockResolvedValue({
				...mockUser,
				apiKey: null,
				apiKeyName: null,
				apiKeyExpiresAt: null,
			});

			await service.revokeApiKey(mockUser.id);

			expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
				apiKey: null,
				apiKeyName: null,
				apiKeyExpiresAt: null,
			});
			expect(userRepository.createAuditLog).toHaveBeenCalled();
		});

		it('should throw NotFoundException for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.revokeApiKey('invalid-id')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('getUserCount', () => {
		it('should return total user count', async () => {
			userRepository.count.mockResolvedValue(100);

			const result = await service.getUserCount();

			expect(result).toBe(100);
		});
	});
});
