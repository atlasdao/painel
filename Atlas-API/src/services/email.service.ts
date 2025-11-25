import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
	private transporter: nodemailer.Transporter;

	constructor(private readonly configService: ConfigService) {
		this.transporter = nodemailer.createTransport({
			host: 'localhost',
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
			await this.transporter.sendMail(mailOptions);
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
			subject: `💰 Venda Aprovada: ${formattedAmount}`,
			html: this.getApprovedSaleEmailTemplate(username, saleData, formattedAmount, formattedDate),
			text: `Olá ${username}! Você recebeu uma nova venda aprovada.\n\nProduto: ${saleData.productName}\nValor: ${formattedAmount}\nComprador: ${saleData.buyerName || 'Não informado'}\nData: ${formattedDate}\nID: ${saleData.transactionId}\n\nPara desabilitar estas notificações, acesse: https://painel.atlasdao.info/settings`,
		};

		try {
			await this.transporter.sendMail(mailOptions);
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
      <td style="padding: 25px; text-align: center; background-color: #10b981;">
        <span style="font-size: 20px; font-weight: bold; color: #ffffff;">PAINEL ATLAS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 25px;">
        <h2 style="margin: 0 0 10px; font-size: 22px; color: #10b981;">&#127881; Venda Aprovada!</h2>
        <p style="margin: 0 0 25px; font-size: 15px; color: #555;">Olá <strong>${username}</strong>, você acaba de receber um pagamento.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #666;">Valor recebido</p>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #10b981;">${formattedAmount}</p>
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
			await this.transporter.sendMail(mailOptions);
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
}
