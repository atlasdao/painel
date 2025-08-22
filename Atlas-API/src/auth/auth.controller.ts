import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Req, Delete, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, CreateApiKeyDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, VerifyResetCodeDto } from '../common/dto/auth.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
    return req.user;
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
}