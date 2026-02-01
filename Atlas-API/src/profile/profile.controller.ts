import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	UseGuards,
	Request,
	HttpStatus,
	HttpCode,
	Logger,
	ForbiddenException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getEffectiveUserId, getCollaboratorContext } from '../common/decorators/effective-user.decorator';
import { UpdateProfileDto, UploadAvatarDto } from './dto/upload-avatar.dto';
import {
	Setup2FADto,
	Enable2FADto,
	Disable2FADto,
	Verify2FADto,
} from './dto/setup-2fa.dto';
import { UpdateWalletDto } from './dto/wallet.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller({
	path: 'profile',
	version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProfileController {
	private readonly logger = new Logger(ProfileController.name);

	constructor(private readonly profileService: ProfileService) {}

	@Get()
	async getProfile(@Request() req) {
		const effectiveUserId = getEffectiveUserId(req);
		this.logger.log(
			`Profile fetch request - User: ${req.user.id}, EffectiveUser: ${effectiveUserId}, Path: ${req.path}, URL: ${req.url}, BaseURL: ${req.baseUrl}`,
		);
		return this.profileService.getProfile(effectiveUserId);
	}

	@Patch()
	async updateProfile(@Request() req, @Body() updateData: UpdateProfileDto) {
		this.logger.log(`Updating profile for user ${req.user.id}`);
		return this.profileService.updateProfile(req.user.id, updateData);
	}

	@Post('avatar')
	@HttpCode(HttpStatus.OK)
	async uploadAvatar(@Request() req, @Body() avatarData: UploadAvatarDto) {
		const dataSize = avatarData.avatarData ? avatarData.avatarData.length : 0;
		this.logger.log(
			`🚀 AVATAR UPLOAD REQUEST RECEIVED - User: ${req.user.id}, Path: ${req.path}, URL: ${req.url}, Data size: ${dataSize} chars`,
		);
		this.logger.log(
			`🔍 Request details - Method: ${req.method}, Headers: ${JSON.stringify(req.headers['content-type'])}, Body keys: ${Object.keys(avatarData)}`,
		);
		const startTime = Date.now();

		try {
			const result = await this.profileService.uploadAvatar(
				req.user.id,
				avatarData,
			);
			this.logger.log(
				`Avatar upload success - Time: ${Date.now() - startTime}ms`,
			);
			return result;
		} catch (error) {
			this.logger.error(`Avatar upload failed - Error: ${error.message}`);
			throw error;
		}
	}

	@Delete('avatar')
	async deleteAvatar(@Request() req) {
		this.logger.log(`Deleting avatar for user ${req.user.id}`);
		return this.profileService.deleteAvatar(req.user.id);
	}

	@Post('2fa/setup')
	@HttpCode(HttpStatus.OK)
	async setup2FA(@Request() req) {
		this.logger.log(
			`2FA setup request - User: ${req.user.id}, Path: ${req.path}, URL: ${req.url}, OriginalURL: ${req.originalUrl}`,
		);
		const startTime = Date.now();

		try {
			const result = await this.profileService.setup2FA(req.user.id);
			this.logger.log(`2FA setup success - Time: ${Date.now() - startTime}ms`);
			return result;
		} catch (error) {
			this.logger.error(`2FA setup failed - Error: ${error.message}`);
			throw error;
		}
	}

	@Post('2fa/verify')
	@HttpCode(HttpStatus.OK)
	async verify2FA(@Request() req, @Body() dto: Verify2FADto) {
		this.logger.log(`Verifying 2FA for user ${req.user.id}`);
		return this.profileService.verify2FA(req.user.id, dto);
	}

	@Post('2fa/disable')
	@HttpCode(HttpStatus.OK)
	async disable2FA(@Request() req, @Body() dto: Disable2FADto) {
		this.logger.log(`Disabling 2FA for user ${req.user.id}`);
		return this.profileService.disable2FA(req.user.id, dto);
	}

	@Get('2fa/status')
	async get2FAStatus(@Request() req) {
		this.logger.log(`Fetching 2FA status for user ${req.user.id}`);
		return this.profileService.get2FAStatus(req.user.id);
	}

	@Post('2fa/backup-code/verify')
	@HttpCode(HttpStatus.OK)
	async verifyBackupCode(@Request() req, @Body() body: { backupCode: string }) {
		this.logger.log(`Verifying backup code for user ${req.user.id}`);
		return this.profileService.verifyBackupCode(req.user.id, body.backupCode);
	}

	@Post('2fa/backup-codes/regenerate')
	@HttpCode(HttpStatus.OK)
	async regenerateBackupCodes(@Request() req, @Body() body: { token: string }) {
		this.logger.log(`Regenerating backup codes for user ${req.user.id}`);
		return this.profileService.regenerateBackupCodes(req.user.id, body.token);
	}

	@Post('2fa/periodic-check/toggle')
	@HttpCode(HttpStatus.OK)
	async togglePeriodicCheck(@Request() req, @Body() body: { enabled: boolean }) {
		this.logger.log(`Toggling periodic check for user ${req.user.id}: ${body.enabled}`);
		return this.profileService.togglePeriodicCheck(req.user.id, body.enabled);
	}

	@Patch('wallet')
	async updateWallet(@Request() req, @Body() dto: UpdateWalletDto) {
		this.logger.log(
			`Wallet update request - User: ${req.user.id}, Path: ${req.path}, URL: ${req.url}`,
		);

		// Verificar se é colaborador tentando alterar carteira
		const collaboratorContext = getCollaboratorContext(req);
		if (collaboratorContext.isCollaborating) {
			this.logger.warn(
				`Collaborator ${collaboratorContext.authenticatedUserId} (role: ${collaboratorContext.role}) attempted to update wallet`,
			);
			throw new ForbiddenException(
				'Colaboradores não podem alterar as configurações de carteira da conta',
			);
		}

		const startTime = Date.now();

		try {
			const result = await this.profileService.updateWallet(req.user.id, dto);
			this.logger.log(
				`Wallet update success - Time: ${Date.now() - startTime}ms`,
			);
			return result;
		} catch (error) {
			this.logger.error(`Wallet update failed - Error: ${error.message}`);
			throw error;
		}
	}

	@Post('change-password')
	@HttpCode(HttpStatus.OK)
	async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
		this.logger.log(`Changing password for user ${req.user.id}`);
		return this.profileService.changePassword(req.user.id, dto);
	}

	@Get('limits')
	async getUserLimits(@Request() req) {
		const effectiveUserId = getEffectiveUserId(req);
		this.logger.log(`Fetching limits for user ${req.user.id}, EffectiveUser: ${effectiveUserId}`);
		return this.profileService.getUserLimits(effectiveUserId);
	}

	@Post('commerce-mode/toggle')
	@HttpCode(HttpStatus.OK)
	async toggleCommerceMode(@Request() req) {
		this.logger.log(`Toggling commerce mode for user ${req.user.id}`);
		return this.profileService.toggleCommerceMode(req.user.id);
	}
}
