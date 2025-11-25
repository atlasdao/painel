import {
	Controller,
	Post,
	Body,
	HttpCode,
	HttpStatus,
	UseGuards,
	Get,
	Req,
	Delete,
	Query,
	Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
	RegisterDto,
	LoginDto,
	CreateApiKeyDto,
	RefreshTokenDto,
	ForgotPasswordDto,
	ResetPasswordDto,
	VerifyResetCodeDto,
} from '../common/dto/auth.dto';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Post('register')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Register a new user' })
	@ApiResponse({ status: 201, description: 'User successfully registered' })
	@ApiResponse({ status: 409, description: 'Email or username already exists' })
	async register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Public()
	@Post('login')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Login with email/username and password' })
	@ApiResponse({ status: 200, description: 'Successfully logged in' })
	@ApiResponse({ status: 401, description: 'Invalid credentials or 2FA required' })
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@Public()
	@Post('verify-2fa')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Verify 2FA code for login' })
	@ApiResponse({ status: 200, description: '2FA verified successfully' })
	@ApiResponse({ status: 401, description: 'Invalid 2FA code' })
	async verify2FA(@Body() body: { email: string; twoFactorToken: string }) {
		console.log('[AUTH CONTROLLER] verify2FA called with body:', body);
		console.log('[AUTH CONTROLLER] Email received:', body.email);
		console.log('[AUTH CONTROLLER] Token received:', body.twoFactorToken);

		// For 2FA verification, we need to call the auth service
		return this.authService.verify2FA(body.email, body.twoFactorToken);
	}

	@Public()
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Refresh access token using refresh token' })
	@ApiResponse({ status: 200, description: 'Token refreshed successfully' })
	@ApiResponse({ status: 401, description: 'Invalid refresh token' })
	async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
		return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
	}

	// Deprecated: API token generation now requires admin approval
	// Use /api-key-requests endpoint instead
	// @Post('apitoken')
	// @UseGuards(JwtAuthGuard)
	// @HttpCode(HttpStatus.CREATED)
	// @ApiBearerAuth()
	// @ApiOperation({ summary: 'Generate API token for user' })
	// @ApiResponse({ status: 201, description: 'API token generated' })
	// @ApiResponse({ status: 401, description: 'Unauthorized' })
	// async generateApiToken(
	//   @Req() req: any,
	//   @Body() createApiKeyDto: CreateApiKeyDto,
	// ) {
	//   const userId = req.user.id || req.user.sub;
	//   return this.authService.generateApiToken(userId, createApiKeyDto);
	// }

	@Get('apitoken')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Check if user has API token' })
	@ApiResponse({ status: 200, description: 'API token status' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getApiTokenStatus(@Req() req: any) {
		const userId = req.user.id || req.user.sub;
		return this.authService.getApiKeyStatus(userId);
	}

	@Delete('apitoken')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Revoke API token for user' })
	@ApiResponse({ status: 204, description: 'API token revoked' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async revokeApiToken(@Req() req: any) {
		const userId = req.user.id || req.user.sub;
		await this.authService.revokeApiKey(userId);
	}

	@Get('profile')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get current user profile' })
	@ApiResponse({ status: 200, description: 'User profile retrieved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getProfile(@Req() req: any) {
		// Fetch complete user data including commerce fields
		const user = await this.authService.getUserProfile(req.user.id);
		return user;
	}

	@Patch('notification-settings')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Update notification settings' })
	@ApiResponse({ status: 200, description: 'Notification settings updated' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async updateNotificationSettings(
		@Req() req: any,
		@Body() settings: { notifyApprovedSales?: boolean; notifyReviewSales?: boolean },
	) {
		return this.authService.updateNotificationSettings(req.user.id, settings);
	}

	@Public()
	@Post('validate')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Validate JWT token' })
	@ApiResponse({ status: 200, description: 'Token is valid' })
	@ApiResponse({ status: 401, description: 'Invalid token' })
	async validateToken(@Body('token') token: string) {
		const payload = await this.authService.validateToken(token);
		return {
			valid: true,
			payload,
		};
	}

	// ===== PASSWORD RESET ENDPOINTS =====

	@Public()
	@Post('forgot-password')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Request password reset code' })
	@ApiResponse({ status: 200, description: 'Reset code sent if email exists' })
	@ApiResponse({ status: 400, description: 'Invalid request or rate limited' })
	async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
		return this.authService.forgotPassword(forgotPasswordDto);
	}

	@Public()
	@Post('verify-reset-code')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Verify password reset code' })
	@ApiResponse({ status: 200, description: 'Reset code verified' })
	@ApiResponse({ status: 400, description: 'Invalid or expired code' })
	async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
		return this.authService.verifyResetCode(verifyResetCodeDto);
	}

	@Public()
	@Post('reset-password')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Reset password with code' })
	@ApiResponse({ status: 200, description: 'Password reset successfully' })
	@ApiResponse({ status: 400, description: 'Invalid code or request' })
	async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
		return this.authService.resetPassword(resetPasswordDto);
	}

	// ===== EMAIL VERIFICATION ENDPOINTS =====

	@Public()
	@Get('verify-email')
	@ApiOperation({ summary: 'Verify email with token' })
	@ApiQuery({ name: 'token', required: true, description: 'Email verification token' })
	@ApiResponse({ status: 200, description: 'Email verified successfully' })
	@ApiResponse({ status: 400, description: 'Invalid or expired token' })
	async verifyEmail(@Query('token') token: string) {
		return this.authService.verifyEmail(token);
	}

	@Public()
	@Post('resend-verification')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Resend email verification' })
	@ApiResponse({ status: 200, description: 'Verification email sent if account exists' })
	@ApiResponse({ status: 400, description: 'Account already verified' })
	async resendVerification(@Body('email') email: string) {
		return this.authService.resendVerificationEmail(email);
	}
}
