import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RegisterDto, LoginDto, CreateApiKeyDto, RefreshTokenDto } from '../common/dto/auth.dto'
import { HttpStatus } from '@nestjs/common'

describe('AuthController', () => {
	let controller: AuthController
	let authService: jest.Mocked<AuthService>

	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		username: 'testuser',
		roles: ['user'],
		isActive: true,
		createdAt: new Date(),
		lastLoginAt: new Date(),
	}

	const mockAuthResponse = {
		accessToken: 'access_token_123',
		refreshToken: 'refresh_token_123',
		tokenType: 'Bearer',
		expiresIn: 86400,
		user: mockUser,
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: {
						register: jest.fn(),
						login: jest.fn(),
						refreshAccessToken: jest.fn(),
						generateApiToken: jest.fn(),
						revokeApiKey: jest.fn(),
						validateToken: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({ canActivate: jest.fn(() => true) })
			.compile()

		controller = module.get<AuthController>(AuthController)
		authService = module.get(AuthService) as jest.Mocked<AuthService>
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('register', () => {
		it('should register a new user successfully', async () => {
			const registerDto: RegisterDto = {
				email: 'new@example.com',
				username: 'newuser',
				password: 'StrongPassword123',
			}

			authService.register.mockResolvedValue(mockAuthResponse)

			const result = await controller.register(registerDto)

			expect(result).toEqual(mockAuthResponse)
			expect(authService.register).toHaveBeenCalledWith(registerDto)
			expect(authService.register).toHaveBeenCalledTimes(1)
		})

		it('should handle registration with existing email', async () => {
			const registerDto: RegisterDto = {
				email: 'existing@example.com',
				username: 'newuser',
				password: 'Password123',
			}

			const error = new Error('Email already exists')
			;(error as any).status = HttpStatus.CONFLICT
			authService.register.mockRejectedValue(error)

			await expect(controller.register(registerDto)).rejects.toThrow(error)
		})
	})

	describe('login', () => {
		it('should login with email successfully', async () => {
			const loginDto: LoginDto = {
				emailOrUsername: 'test@example.com',
				password: 'Password123',
			}

			authService.login.mockResolvedValue(mockAuthResponse)

			const result = await controller.login(loginDto)

			expect(result).toEqual(mockAuthResponse)
			expect(authService.login).toHaveBeenCalledWith(loginDto)
		})

		it('should login with username successfully', async () => {
			const loginDto: LoginDto = {
				emailOrUsername: 'testuser',
				password: 'Password123',
			}

			authService.login.mockResolvedValue(mockAuthResponse)

			const result = await controller.login(loginDto)

			expect(result).toEqual(mockAuthResponse)
			expect(authService.login).toHaveBeenCalledWith(loginDto)
		})

		it('should handle invalid credentials', async () => {
			const loginDto: LoginDto = {
				emailOrUsername: 'test@example.com',
				password: 'WrongPassword',
			}

			const error = new Error('Invalid credentials')
			;(error as any).status = HttpStatus.UNAUTHORIZED
			authService.login.mockRejectedValue(error)

			await expect(controller.login(loginDto)).rejects.toThrow(error)
		})
	})

	describe('refresh', () => {
		it('should refresh access token successfully', async () => {
			const refreshTokenDto: RefreshTokenDto = {
				refreshToken: 'valid_refresh_token',
			}

			const refreshResponse = {
				accessToken: 'new_access_token',
				refreshToken: 'new_refresh_token',
				tokenType: 'Bearer',
				expiresIn: 86400,
				user: mockUser,
			}

			authService.refreshAccessToken.mockResolvedValue(refreshResponse)

			const result = await controller.refresh(refreshTokenDto)

			expect(result).toEqual(refreshResponse)
			expect(authService.refreshAccessToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken)
		})

		it('should handle invalid refresh token', async () => {
			const refreshTokenDto: RefreshTokenDto = {
				refreshToken: 'invalid_refresh_token',
			}

			const error = new Error('Invalid refresh token')
			;(error as any).status = HttpStatus.UNAUTHORIZED
			authService.refreshAccessToken.mockRejectedValue(error)

			await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(error)
		})
	})

	describe('generateApiToken', () => {
		it('should generate API token with expiration', async () => {
			const createApiKeyDto: CreateApiKeyDto = {
				name: 'Production API Key',
				expirationDays: 365,
			}

			const mockRequest = {
				user: {
					sub: 'user-123',
					email: 'test@example.com',
				},
			}

			const apiKeyResponse = {
				apiKey: 'sk_live_abc123xyz',
				name: 'Production API Key',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			}

			authService.generateApiToken.mockResolvedValue(apiKeyResponse)

			const result = await controller.generateApiToken(mockRequest, createApiKeyDto)

			expect(result).toEqual(apiKeyResponse)
			expect(authService.generateApiToken).toHaveBeenCalledWith('user-123', createApiKeyDto)
		})

		it('should generate API token without expiration', async () => {
			const createApiKeyDto: CreateApiKeyDto = {
				name: 'Permanent API Key',
			}

			const mockRequest = {
				user: {
					id: 'user-123',
				},
			}

			const apiKeyResponse = {
				apiKey: 'sk_live_permanent123',
				name: 'Permanent API Key',
				createdAt: new Date(),
				expiresAt: null,
			}

			authService.generateApiToken.mockResolvedValue(apiKeyResponse)

			const result = await controller.generateApiToken(mockRequest, createApiKeyDto)

			expect(result).toEqual(apiKeyResponse)
			expect(authService.generateApiToken).toHaveBeenCalledWith('user-123', createApiKeyDto)
		})
	})

	describe('revokeApiToken', () => {
		it('should revoke API token successfully', async () => {
			const mockRequest = {
				user: {
					sub: 'user-123',
				},
			}

			authService.revokeApiKey.mockResolvedValue(undefined)

			await controller.revokeApiToken(mockRequest)

			expect(authService.revokeApiKey).toHaveBeenCalledWith('user-123')
			expect(authService.revokeApiKey).toHaveBeenCalledTimes(1)
		})

		it('should handle user ID from different JWT payload format', async () => {
			const mockRequest = {
				user: {
					id: 'user-456',
				},
			}

			authService.revokeApiKey.mockResolvedValue(undefined)

			await controller.revokeApiToken(mockRequest)

			expect(authService.revokeApiKey).toHaveBeenCalledWith('user-456')
		})
	})

	describe('getProfile', () => {
		it('should return current user profile', async () => {
			const mockRequest = {
				user: mockUser,
			}

			const result = await controller.getProfile(mockRequest)

			expect(result).toEqual(mockUser)
		})

		it('should return profile with additional user data', async () => {
			const extendedUser = {
				...mockUser,
				apiKey: 'sk_live_123',
				permissions: ['read', 'write'],
			}

			const mockRequest = {
				user: extendedUser,
			}

			const result = await controller.getProfile(mockRequest)

			expect(result).toEqual(extendedUser)
			expect(result).toHaveProperty('apiKey')
			expect(result).toHaveProperty('permissions')
		})
	})

	describe('validateToken', () => {
		it('should validate token successfully', async () => {
			const token = 'valid_jwt_token'
			const payload = {
				sub: 'user-123',
				email: 'test@example.com',
				username: 'testuser',
				exp: Math.floor(Date.now() / 1000) + 3600,
			}

			authService.validateToken.mockResolvedValue(payload)

			const result = await controller.validateToken(token)

			expect(result).toEqual({
				valid: true,
				payload,
			})
			expect(authService.validateToken).toHaveBeenCalledWith(token)
		})

		it('should handle invalid token', async () => {
			const token = 'invalid_jwt_token'
			const error = new Error('Invalid token')
			;(error as any).status = HttpStatus.UNAUTHORIZED

			authService.validateToken.mockRejectedValue(error)

			await expect(controller.validateToken(token)).rejects.toThrow(error)
		})

		it('should handle expired token', async () => {
			const token = 'expired_jwt_token'
			const error = new Error('Token expired')
			;(error as any).status = HttpStatus.UNAUTHORIZED

			authService.validateToken.mockRejectedValue(error)

			await expect(controller.validateToken(token)).rejects.toThrow(error)
		})
	})

	describe('Guards', () => {
		it('should have JwtAuthGuard applied to protected endpoints', () => {
			const guards = Reflect.getMetadata('__guards__', controller.generateApiToken)
			expect(guards).toBeDefined()
		})

		it('should have Public decorator on public endpoints', () => {
			const isPublic = Reflect.getMetadata('isPublic', controller.register)
			expect(isPublic).toBe(true)
		})
	})
})