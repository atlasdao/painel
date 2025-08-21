import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, VerifyResetCodeDto } from '../common/dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<import("../common/dto/auth.dto").AuthResponseDto>;
    login(loginDto: LoginDto): Promise<import("../common/dto/auth.dto").AuthResponseDto>;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<import("../common/dto/auth.dto").AuthResponseDto>;
    getApiTokenStatus(req: any): Promise<{
        hasApiKey: boolean;
        createdAt?: Date;
    }>;
    revokeApiToken(req: any): Promise<void>;
    getProfile(req: any): Promise<any>;
    validateToken(token: string): Promise<{
        valid: boolean;
        payload: import("./auth.service").JwtPayload;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{
        valid: boolean;
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
