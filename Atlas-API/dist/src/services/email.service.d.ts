import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly configService;
    private transporter;
    constructor(configService: ConfigService);
    sendPasswordResetEmail(email: string, resetCode: string): Promise<void>;
    private getPasswordResetEmailTemplate;
    sendWelcomeEmail(email: string, username: string): Promise<void>;
    private getWelcomeEmailTemplate;
}
