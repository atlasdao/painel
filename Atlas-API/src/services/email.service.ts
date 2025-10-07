import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
	private transporter: nodemailer.Transporter;

	constructor(private readonly configService: ConfigService) {
		this.transporter = nodemailer.createTransport({
			host: 'smtp.me.com', // iCloud SMTP
			port: 587,
			secure: false, // Use TLS
			auth: {
				user: this.configService.get<string>('SMTP_LOGIN_EMAIL'),
				pass: this.configService.get<string>('SMTP_LOGIN_PASSWORD'),
			},
			tls: {
				rejectUnauthorized: this.configService.get<boolean>('SMTP_TLS', true),
			},
		});
	}

	async sendPasswordResetEmail(
		email: string,
		resetCode: string,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER');

		const mailOptions = {
			from: `"Atlas DAO" <${senderEmail}>`,
			to: email,
			subject: 'Recuperação de Senha - Atlas DAO',
			html: this.getPasswordResetEmailTemplate(resetCode),
			text: `Seu código de recuperação de senha é: ${resetCode}\n\nEste código expira em 15 minutos.\n\nSe você não solicitou esta recuperação, ignore este email.`,
		};

		try {
			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending password reset email:', error);
			throw new Error('Failed to send password reset email');
		}
	}

	private getPasswordResetEmailTemplate(resetCode: string): string {
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - Atlas DAO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: #fff; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔷 Atlas DAO</div>
            <h1>Recuperação de Senha</h1>
          </div>
          
          <div class="content">
            <h2>Olá!</h2>
            <p>Você solicitou a recuperação de senha para sua conta na Atlas DAO.</p>
            
            <p>Use o código abaixo para redefinir sua senha:</p>
            
            <div class="code-box">
              <div class="code">${resetCode}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este código expira em <strong>15 minutos</strong></li>
                <li>Não compartilhe este código com ninguém</li>
                <li>Se você não solicitou esta recuperação, ignore este email</li>
              </ul>
            </div>
            
            <p>Para redefinir sua senha:</p>
            <ol>
              <li>Acesse a página de recuperação de senha na Atlas DAO</li>
              <li>Digite o código acima</li>
              <li>Defina sua nova senha</li>
            </ol>
            
            <p>Se você não conseguir inserir o código, entre em contato com nosso suporte.</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Atlas DAO. Todos os direitos reservados.</p>
            <p>Este é um email automático, não responda a esta mensagem.</p>
          </div>
        </div>
      </body>
      </html>
    `;
	}

	async sendWelcomeEmail(email: string, username: string): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER');

		const mailOptions = {
			from: `"Atlas DAO" <${senderEmail}>`,
			to: email,
			subject: 'Bem-vindo à Atlas DAO!',
			html: this.getWelcomeEmailTemplate(username),
			text: `Bem-vindo à Atlas DAO, ${username}!\n\nSua conta foi criada com sucesso. Agora você pode começar a usar nossos serviços de PIX e DePix.\n\nObrigado por escolher a Atlas DAO!`,
		};

		try {
			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending welcome email:', error);
			// Don't throw error for welcome email - it's not critical
		}
	}

	private getWelcomeEmailTemplate(username: string): string {
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo à Atlas DAO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .welcome-box { background: #e8f5e8; border: 1px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔷 Atlas DAO</div>
            <h1>Bem-vindo!</h1>
          </div>
          
          <div class="content">
            <div class="welcome-box">
              <h2>🎉 Olá, ${username}!</h2>
              <p>Sua conta foi criada com sucesso na Atlas DAO!</p>
            </div>
            
            <p>Agora você pode aproveitar todos os nossos serviços:</p>
            
            <div class="feature">
              <h3>💳 PIX Instantâneo</h3>
              <p>Realize depósitos e saques via PIX de forma rápida e segura</p>
            </div>
            
            <div class="feature">
              <h3>🔗 Integração DePix</h3>
              <p>Conecte suas carteiras de criptomoedas com facilidade</p>
            </div>
            
            <div class="feature">
              <h3>🔑 API Keys</h3>
              <p>Integre nossos serviços em suas aplicações</p>
            </div>
            
            <div class="feature">
              <h3>🛡️ Segurança MED</h3>
              <p>Conformidade total com regulamentações brasileiras</p>
            </div>
            
            <p><strong>Próximos passos:</strong></p>
            <ol>
              <li>Faça login em sua conta</li>
              <li>Configure seus limites se necessário</li>
              <li>Realize sua primeira transação</li>
            </ol>
            
            <p>Se tiver dúvidas, nossa equipe está pronta para ajudar!</p>
          </div>
          
          <div class="footer">
            <p>© 2025 Atlas DAO. Todos os direitos reservados.</p>
            <p>Este é um email automático, não responda a esta mensagem.</p>
          </div>
        </div>
      </body>
      </html>
    `;
	}
}
