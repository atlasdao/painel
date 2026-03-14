import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
	private transporter: nodemailer.Transporter;
	private comunicacaoTransporter: nodemailer.Transporter;

	constructor(private readonly configService: ConfigService) {
		// Transporter para contato@atlasdao.info
		this.transporter = nodemailer.createTransport({
			host: '127.0.0.1',
			port: 587,
			secure: false,
			auth: {
				user: this.configService.get<string>('SMTP_LOGIN_EMAIL'),
				pass: this.configService.get<string>('SMTP_LOGIN_PASSWORD'),
			},
			tls: {
				rejectUnauthorized: false,
			},
		});

		// Transporter para comunicacao@atlasdao.info
		this.comunicacaoTransporter = nodemailer.createTransport({
			host: '127.0.0.1',
			port: 587,
			secure: false,
			auth: {
				user: this.configService.get<string>('SMTP_LOGIN_EMAIL_COMUNICACAO'),
				pass: this.configService.get<string>('SMTP_LOGIN_PASSWORD_COMUNICACAO'),
			},
			tls: {
				rejectUnauthorized: false,
			},
		});
	}

	async sendEmailVerification(
		email: string,
		username: string,
		verificationToken: string,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO');
		const baseUrl = this.configService.get<string>('FRONTEND_URL', 'https://painel.atlasdao.info');
		const verificationLink = `${baseUrl}/confirm-email?token=${verificationToken}`;

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: 'Confirme sua conta Atlas',
			html: this.getEmailVerificationTemplate(username, verificationLink),
			text: `Falta pouco, ${username}!\n\nConfirme seu email e comece a receber pagamentos PIX via DePIX com a menor taxa do mercado.\n\nClique no link: ${verificationLink}\n\nEste link expira em 24 horas.`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending email verification:', error);
			throw new Error('Failed to send email verification');
		}
	}

	private getEmailVerificationTemplate(username: string, verificationLink: string): string {
		return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #7c3aed;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 20px; font-size: 20px; color: #333;">Falta pouco, ${username}!</h2>

        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Sua conta esta quase pronta. Confirme seu email e comece a receber pagamentos PIX via <strong style="color: #7c3aed;">DePIX</strong> com a menor taxa do mercado - de forma instantanea, sem burocracia.</p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 10px 0 30px;">
              <a href="${verificationLink}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 35px; font-weight: bold; font-size: 14px;">CONFIRMAR E COMECAR AGORA</a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 15px; font-size: 15px; color: #333;"><strong>O que te espera:</strong></p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">&#128176; Receba PIX 24h por dia, 7 dias por semana</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">&#9889; Dinheiro na conta em segundos, nao em dias</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">&#128202; Dashboard profissional para seu negocio</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">&#128279; Links de pagamento para compartilhar e vender mais</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #555;">&#128268; API simples para automatizar tudo</p>

        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Enquanto outros comerciantes ainda estao esperando aprovacao de banco, voce ja vai estar faturando.</p>

        <p style="margin: 0 0 5px; font-size: 13px; color: #888;">Este link expira em 24 horas.</p>
        <p style="margin: 0; font-size: 13px; color: #888;">Se voce nao criou esta conta, ignore este email.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
	}

	async sendPasswordResetEmail(
		email: string,
		resetCode: string,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER');

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: 'Código de Recuperação - Painel Atlas',
			html: this.getPasswordResetEmailTemplate(resetCode),
			text: `Seu código de recuperação de senha é: ${resetCode}\n\nEste código expira em 10 minutos.\n\nSe você não solicitou esta recuperação, ignore este email.`,
		};

		try {
			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending password reset email:', error);
			throw new Error('Failed to send password reset email');
		}
	}

	private getPasswordResetEmailTemplate(resetCode: string): string {
		return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #7c3aed;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 20px; font-size: 20px; color: #333;">Recuperação de Senha</h2>

        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Você solicitou a recuperação de senha da sua conta. Use o código abaixo para redefinir sua senha:</p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <div style="background-color: #f3f4f6; border: 2px dashed #7c3aed; padding: 20px 30px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; color: #7c3aed; letter-spacing: 8px; font-family: monospace;">${resetCode}</span>
              </div>
            </td>
          </tr>
        </table>

        <p style="margin: 20px 0 8px; font-size: 14px; color: #555;">&#9888; Este código expira em <strong>10 minutos</strong></p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #555;">&#128274; Não compartilhe este código com ninguém</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #555;">&#10060; Se você não solicitou, ignore este email</p>

        <p style="margin: 0; font-size: 13px; color: #888;">Este é um email automático, não responda.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
	}

	async sendWelcomeEmail(email: string, username: string): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER');

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: 'Bem-vindo ao Painel Atlas!',
			html: this.getWelcomeEmailTemplate(username),
			text: `Bem-vindo ao Painel Atlas, ${username}!\n\nSua conta foi criada com sucesso. Agora você pode começar a usar nossos serviços de PIX e DePIX.\n\nObrigado por escolher o Painel Atlas!`,
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
        <title>Bem-vindo ao Painel Atlas</title>
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
            <div class="logo">🔷 Painel Atlas</div>
            <h1>Bem-vindo!</h1>
          </div>

          <div class="content">
            <div class="welcome-box">
              <h2>🎉 Olá, ${username}!</h2>
              <p>Sua conta foi criada com sucesso no Painel Atlas!</p>
            </div>

            <p>Agora você pode aproveitar todos os nossos serviços:</p>

            <div class="feature">
              <h3>💳 PIX Instantâneo</h3>
              <p>Realize depósitos e saques via PIX de forma rápida e segura</p>
            </div>

            <div class="feature">
              <h3>🔗 Integração DePIX</h3>
              <p>Conecte suas carteiras de criptomoedas com facilidade</p>
            </div>

            <div class="feature">
              <h3>🔑 API Keys</h3>
              <p>Integre nossos serviços em suas aplicações</p>
            </div>

            <div class="feature">
              <h3>🛡️ Segurança</h3>
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
            <p>© 2025 Painel Atlas. Todos os direitos reservados.</p>
            <p>Este é um email automático, não responda a esta mensagem.</p>
          </div>
        </div>
      </body>
      </html>
    `;
	}

	async sendApprovedSaleEmail(
		email: string,
		username: string,
		saleData: {
			productName: string;
			amount: number;
			buyerName?: string;
			transactionId: string;
			paymentMethod: string;
			createdAt: Date;
			settlementInfo?: {
				isInstant: boolean;
				scheduledAt?: Date;
			};
		},
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO') || this.configService.get<string>('SMTP_EMAIL_SENDER');

		const formattedAmount = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(saleData.amount);

		const formattedDate = new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(saleData.createdAt);

		// Format settlement info
		let settlementText = '';
		if (saleData.settlementInfo?.isInstant) {
			settlementText = 'O valor já foi creditado na sua carteira.';
		} else if (saleData.settlementInfo?.scheduledAt) {
			const formattedSettlement = new Intl.DateTimeFormat('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			}).format(saleData.settlementInfo.scheduledAt);
			settlementText = `O valor será creditado na sua carteira em ${formattedSettlement}.`;
		}

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: `💰 Pagamento Confirmado: ${formattedAmount}`,
			html: this.getApprovedSaleEmailTemplate(username, saleData, formattedAmount, formattedDate, settlementText),
			text: `Olá ${username}! Você recebeu um novo pagamento confirmado.\n\nProduto: ${saleData.productName}\nValor: ${formattedAmount}\nComprador: ${saleData.buyerName || 'Não informado'}\nData: ${formattedDate}\nID: ${saleData.transactionId}\n\n${settlementText}\n\nPara desabilitar estas notificações, acesse: https://painel.atlasdao.info/settings`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending approved sale email:', error);
			// Don't throw - notification emails shouldn't break the flow
		}
	}

	private getApprovedSaleEmailTemplate(
		username: string,
		saleData: {
			productName: string;
			amount: number;
			buyerName?: string;
			transactionId: string;
			paymentMethod: string;
			settlementInfo?: {
				isInstant: boolean;
				scheduledAt?: Date;
			};
		},
		formattedAmount: string,
		formattedDate: string,
		settlementText: string,
	): string {
		// Determine settlement section styling based on instant or scheduled
		const isInstant = saleData.settlementInfo?.isInstant ?? true;
		const settlementBgColor = isInstant ? '#f0fdf4' : '#fef3c7';
		const settlementBorderColor = isInstant ? '#10b981' : '#f59e0b';
		const settlementTextColor = isInstant ? '#10b981' : '#92400e';
		const settlementIcon = isInstant ? '&#10003;' : '&#128337;';
		const settlementTitle = isInstant ? 'Crédito Instantâneo' : 'Próxima Remessa';

		return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #10b981;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 10px; font-size: 22px; color: #10b981;">&#127881; Pagamento Confirmado!</h2>
        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Olá <strong>${username}</strong>, você acaba de receber um pagamento.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Valor recebido</p>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #10b981;">${formattedAmount}</p>
            </td>
          </tr>
        </table>

        <!-- Settlement Info Section -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${settlementBgColor}; border: 1px solid ${settlementBorderColor}; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 15px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: ${settlementTextColor}; font-weight: bold;">${settlementIcon} ${settlementTitle}</p>
              <p style="margin: 0; font-size: 14px; color: ${settlementTextColor};">${settlementText}</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Produto</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${saleData.productName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Comprador</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${saleData.buyerName || 'Não informado'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Método de Pagamento</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${saleData.paymentMethod}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Data e Hora</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${formattedDate}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <span style="font-size: 14px; color: #888;">ID da Transação</span><br>
              <span style="font-size: 13px; color: #333; font-family: monospace;">${saleData.transactionId}</span>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 10px 0 20px;">
              <a href="https://painel.atlasdao.info/transactions" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: bold; font-size: 14px; border-radius: 6px;">VER TRANSAÇÕES</a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">Este é um email automático, não responda.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee; background-color: #fafafa;">
        <p style="margin: 0 0 10px; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
        <p style="margin: 0; font-size: 11px; color: #aaa;">
          Não deseja mais receber estas notificações?<br>
          <a href="https://painel.atlasdao.info/settings" style="color: #7c3aed;">Desabilite em Configurações > Notificações</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
	}

	async sendReviewSaleEmail(
		email: string,
		username: string,
		saleData: {
			productName: string;
			amount: number;
			buyerName?: string;
			transactionId: string;
			paymentMethod: string;
			createdAt: Date;
		},
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO') || this.configService.get<string>('SMTP_EMAIL_SENDER');

		const formattedAmount = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(saleData.amount);

		const formattedDate = new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(saleData.createdAt);

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: `⚠️ Compra em Revisão: Ação necessária`,
			html: this.getReviewSaleEmailTemplate(username, saleData, formattedAmount, formattedDate),
			text: `Olá ${username}! Sua transação de ${formattedAmount} está em revisão.\n\nProduto: ${saleData.productName}\nValor: ${formattedAmount}\nComprador: ${saleData.buyerName || 'Não informado'}\nData: ${formattedDate}\nID: ${saleData.transactionId}\n\nIsso geralmente acontece quando algum limite foi excedido. Entre em contato com o suporte: https://t.me/atlasDAO_support`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending review sale email:', error);
			// Don't throw - notification emails shouldn't break the flow
		}
	}

	private getReviewSaleEmailTemplate(
		username: string,
		saleData: {
			productName: string;
			amount: number;
			buyerName?: string;
			transactionId: string;
			paymentMethod: string;
		},
		formattedAmount: string,
		formattedDate: string,
	): string {
		return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #f59e0b;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 10px; font-size: 22px; color: #f59e0b;">&#9888;&#65039; Transação em Revisão</h2>
        <p style="margin: 0 0 20px; font-size: 15px; color: #555;">Olá <strong>${username}</strong>, sua transação está sendo analisada.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Valor da transação</p>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #f59e0b;">${formattedAmount}</p>
            </td>
          </tr>
        </table>

        <!-- CTA PRINCIPAL - DESTAQUE -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dc2626; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 18px; color: #ffffff; font-weight: bold;">&#128680; Ação Necessária</p>
              <p style="margin: 0 0 15px; font-size: 14px; color: #fecaca;">Para liberar sua transação, entre em contato com nosso suporte agora:</p>
              <a href="https://t.me/atlasDAO_support" style="display: inline-block; background-color: #ffffff; color: #dc2626; text-decoration: none; padding: 14px 35px; font-weight: bold; font-size: 16px; border-radius: 6px;">CHAMAR SUPORTE NO TELEGRAM</a>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 15px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #92400e; font-weight: bold;">&#128269; Por que isso aconteceu?</p>
              <p style="margin: 0; font-size: 14px; color: #92400e;">Sua transação foi enviada para revisão provavelmente porque ultrapassou algum limite configurado. Isso é uma medida de segurança para proteger sua conta.</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Produto</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${saleData.productName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Comprador</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${saleData.buyerName || 'Não informado'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 14px; color: #888;">Data e Hora</span><br>
              <span style="font-size: 15px; color: #333; font-weight: 500;">${formattedDate}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <span style="font-size: 14px; color: #888;">ID da Transação</span><br>
              <span style="font-size: 13px; color: #333; font-family: monospace;">${saleData.transactionId}</span>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">Este é um email automático, não responda.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee; background-color: #fafafa;">
        <p style="margin: 0 0 10px; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
        <p style="margin: 0; font-size: 11px; color: #aaa;">
          Não deseja mais receber estas notificações?<br>
          <a href="https://painel.atlasdao.info/settings" style="color: #7c3aed;">Desabilite em Configurações > Notificações</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
	}

	async sendCollaboratorInviteEmail(
		email: string,
		invitedName: string,
		ownerUsername: string,
		roleTitle: string,
		rolePermissions: string[],
		inviteLink: string,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO');
		const permissionsList = rolePermissions.map((p) => `<li style="margin: 5px 0;">${p}</li>`).join('');

		const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #7c3aed;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 20px; font-size: 20px; color: #333;">Olá, ${invitedName}!</h2>

        <p style="margin: 0 0 20px; font-size: 15px; color: #555;">
          <strong>${ownerUsername}</strong> convidou você para colaborar na conta dele no Painel Atlas como <strong style="color: #7c3aed;">${roleTitle}</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #333; font-weight: bold;">O que você poderá fazer:</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
                ${permissionsList}
              </ul>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 10px 0 30px;">
              <a href="${inviteLink}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 35px; font-weight: bold; font-size: 14px; border-radius: 6px;">ACEITAR CONVITE</a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 8px; font-size: 13px; color: #888;">⏰ Este convite expira em 7 dias.</p>
        <p style="margin: 0; font-size: 13px; color: #888;">Se você não conhece ${ownerUsername} ou não solicitou este acesso, ignore este email.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: `${ownerUsername} convidou você para colaborar no Painel Atlas`,
			html,
			text: `Olá ${invitedName}!\n\n${ownerUsername} convidou você para colaborar na conta dele no Painel Atlas como ${roleTitle}.\n\nAceite o convite acessando: ${inviteLink}\n\nEste convite expira em 7 dias.`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending collaborator invite email:', error);
			throw new Error('Failed to send collaborator invite email');
		}
	}

	// ==================== COLLATERAL EMAILS ====================

	async sendCollateralDepositConfirmed(
		email: string,
		username: string,
		amount: number,
		newBalance: number,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO') || this.configService.get<string>('SMTP_EMAIL_SENDER');

		const formattedAmount = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(amount);

		const formattedBalance = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(newBalance);

		// Texto condicional baseado no valor do colateral
		const beneficio2Html = newBalance >= 500
			? `<p style="margin: 0; font-size: 14px; color: #555;">
            <strong>2. Aceite clientes novos sem limite:</strong> Normalmente, a primeira compra de um cliente novo tem limite de R$ 500. Com colateral, você pode aceitar vendas de clientes novos até ${formattedBalance}, sem essa restrição.
          </p>`
			: `<p style="margin: 0; font-size: 14px; color: #555;">
            <strong>2. Venda mais para clientes novos:</strong> Por padrão, a primeira compra de um cliente novo é limitada a R$ 500. Quer aceitar valores maiores logo de cara? Basta aumentar seu colateral! Com R$ 1.000 de colateral, você aceita até R$ 1.000 na primeira venda. Com R$ 2.000, até R$ 2.000 — e assim por diante.
          </p>`;

		const beneficio2Text = newBalance >= 500
			? `2. Aceite clientes novos sem limite: Normalmente, a primeira compra de um cliente novo tem limite de R$ 500. Com colateral, você pode aceitar vendas de clientes novos até ${formattedBalance}, sem essa restrição.`
			: `2. Venda mais para clientes novos: Por padrão, a primeira compra de um cliente novo é limitada a R$ 500. Quer aceitar valores maiores logo de cara? Basta aumentar seu colateral! Com R$ 1.000 de colateral, você aceita até R$ 1.000 na primeira venda. Com R$ 2.000, até R$ 2.000 — e assim por diante.`;

		const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #06b6d4;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 10px; font-size: 22px; color: #06b6d4;">&#10003; Colateral Atualizado</h2>
        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Olá <strong>${username}</strong>, seu depósito de colateral foi confirmado!</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfeff; border: 1px solid #06b6d4; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Valor depositado</p>
              <p style="margin: 0 0 15px; font-size: 28px; font-weight: bold; color: #06b6d4;">${formattedAmount}</p>
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Novo saldo de colateral</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">${formattedBalance}</p>
            </td>
          </tr>
        </table>

        <div style="margin: 0 0 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #06b6d4;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #333; font-weight: bold;">O que você ganha com colateral?</p>
          <p style="margin: 0 0 10px; font-size: 14px; color: #555;">
            <strong>1. Receba na hora (opcional):</strong> Se você quiser, pode ativar o pagamento instantâneo (D+0) nas configurações. Assim, vendas até ${formattedBalance} caem na sua conta imediatamente, sem esperar.
          </p>
          ${beneficio2Html}
        </div>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 10px 0 20px;">
              <a href="https://painel.atlasdao.info/settings" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: bold; font-size: 14px; border-radius: 6px;">VER CONFIGURAÇÕES</a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">Este é um email automático, não responda.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: `✅ Colateral atualizado: ${formattedAmount} depositado`,
			html,
			text: `Olá ${username}!\n\nSeu depósito de colateral de ${formattedAmount} foi confirmado.\n\nNovo saldo de colateral: ${formattedBalance}\n\nO que você ganha com colateral?\n\n1. Receba na hora (opcional): Se você quiser, pode ativar o pagamento instantâneo (D+0) nas configurações. Assim, vendas até ${formattedBalance} caem na sua conta imediatamente, sem esperar.\n\n${beneficio2Text}\n\nAcesse: https://painel.atlasdao.info/settings`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending collateral deposit email:', error);
		}
	}

	async sendCollateralWithdrawalApproved(
		email: string,
		username: string,
		amount: number,
		txId?: string,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO') || this.configService.get<string>('SMTP_EMAIL_SENDER');

		const formattedAmount = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(amount);

		const txInfo = txId ? `<p style="margin: 0; font-size: 12px; color: #888;">TX ID: ${txId}</p>` : '';

		const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #10b981;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 10px; font-size: 22px; color: #10b981;">&#10003; Saque de Colateral Aprovado</h2>
        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Olá <strong>${username}</strong>, seu saque de colateral foi aprovado!</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Valor sacado</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold; color: #10b981;">${formattedAmount}</p>
              ${txInfo}
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 15px; font-size: 14px; color: #555;">O valor foi enviado para a carteira Liquid que você informou. A transação pode levar alguns minutos para ser confirmada na blockchain.</p>

        <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">Este é um email automático, não responda.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: `✅ Saque de colateral aprovado: ${formattedAmount}`,
			html,
			text: `Olá ${username}!\n\nSeu saque de colateral de ${formattedAmount} foi aprovado e enviado para sua carteira.\n\n${txId ? `TX ID: ${txId}` : ''}`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending collateral withdrawal approved email:', error);
		}
	}

	async sendCollateralWithdrawalRejected(
		email: string,
		username: string,
		amount: number,
		reason: string,
	): Promise<void> {
		const senderEmail = this.configService.get<string>('SMTP_EMAIL_SENDER_COMUNICACAO') || this.configService.get<string>('SMTP_EMAIL_SENDER');

		const formattedAmount = new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(amount);

		const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 550px; margin: 0 auto; background: #ffffff;">
    <tr>
      <td style="padding: 25px; text-align: center; background-color: #ef4444;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 10px; font-size: 22px; color: #ef4444;">&#10060; Saque de Colateral Rejeitado</h2>
        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Olá <strong>${username}</strong>, infelizmente seu saque de colateral foi rejeitado.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Valor solicitado</p>
              <p style="margin: 0 0 15px; font-size: 28px; font-weight: bold; color: #ef4444;">${formattedAmount}</p>
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Motivo</p>
              <p style="margin: 0; font-size: 14px; color: #333;">${reason}</p>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 15px; font-size: 14px; color: #555;">O valor foi devolvido ao seu saldo de colateral. Se tiver dúvidas, entre em contato com nosso suporte.</p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 10px 0 20px;">
              <a href="https://t.me/atlasDAO_support" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: bold; font-size: 14px; border-radius: 6px;">FALAR COM SUPORTE</a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">Este é um email automático, não responda.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 25px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #999;">&copy; 2025 Painel Atlas. Todos os direitos reservados.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

		const mailOptions = {
			from: `"Painel Atlas" <${senderEmail}>`,
			replyTo: 'contato@atlasdao.info',
			to: email,
			subject: `❌ Saque de colateral rejeitado`,
			html,
			text: `Olá ${username}!\n\nSeu saque de colateral de ${formattedAmount} foi rejeitado.\n\nMotivo: ${reason}\n\nO valor foi devolvido ao seu saldo de colateral.`,
		};

		try {
			await this.comunicacaoTransporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending collateral withdrawal rejected email:', error);
		}
	}
}
