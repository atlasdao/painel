import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface MockPaymentData {
	pixCode: string;           // Generated PIX QR code
	amount: number;            // Validation amount (10.00 BRL)
	description: string;       // "Validacao de conta"
	expiresAt: Date;          // 24 hours from creation
	paymentId: string;        // Unique mock payment ID
	status: 'PENDING' | 'COMPLETED';
	depixAddress: string;     // Mock DePix address
}

export interface MockQRCodeResponse {
	qrCode: string;
	qrCodeImage: string;
	transactionId: string;
}

@Injectable()
export class MockPaymentService {
	private readonly logger = new Logger(MockPaymentService.name);

	/**
	 * Generate a realistic mock PIX QR code for validation payments
	 */
	generateMockPixQrCode(amount: number, description: string): string {
		// Create a realistic PIX QR code following EMV QRCode standard
		const amountStr = amount.toFixed(2);
		const merchantName = 'Atlas DAO Validacao';
		const merchantCity = 'Sao Paulo';
		const pixKey = 'validacao@atlas.com';
		const reference = Math.random().toString(36).substring(2, 8).toUpperCase();

		// EMV QRCode format for PIX (simplified but realistic)
		// Format: [ID][LENGTH][VALUE]
		const formatField = (id: string, value: string): string => {
			const length = value.length.toString().padStart(2, '0');
			return `${id}${length}${value}`;
		};

		// Build PIX QR code
		let pixCode = '';
		pixCode += formatField('00', '01'); // Payload Format Indicator
		pixCode += formatField('01', '12'); // Point of Initiation Method

		// Merchant Account Info (26 = PIX)
		let merchantInfo = '';
		merchantInfo += formatField('00', 'BR.GOV.BCB.PIX');
		merchantInfo += formatField('01', pixKey);
		pixCode += formatField('26', merchantInfo);

		pixCode += formatField('52', '0000'); // Merchant Category Code
		pixCode += formatField('53', '986');  // Transaction Currency (BRL)
		pixCode += formatField('54', amountStr); // Transaction Amount
		pixCode += formatField('58', 'BR');   // Country Code
		pixCode += formatField('59', merchantName); // Merchant Name
		pixCode += formatField('60', merchantCity); // Merchant City

		// Additional Data Field
		let additionalData = '';
		additionalData += formatField('05', reference);
		pixCode += formatField('62', additionalData);

		// Add mock CRC16 checksum
		pixCode += '6304MOCK';

		this.logger.log(`✅ Generated mock PIX QR code for validation payment`);
		this.logger.log(`💰 Amount: R$ ${amountStr}`);
		this.logger.log(`📝 Description: ${description}`);
		this.logger.log(`🔑 Reference: ${reference}`);

		return pixCode;
	}

	/**
	 * Generate complete mock payment data for validation
	 */
	generateMockPaymentData(userId: string, amount: number = 1.00): MockPaymentData {
		const description = 'Validacao de conta Atlas DAO';
		const pixCode = this.generateMockPixQrCode(amount, description);
		const paymentId = `mock_validation_${uuidv4()}`;
		const depixAddress = this.generateMockDepixAddress();

		const paymentData: MockPaymentData = {
			pixCode,
			amount,
			description,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
			paymentId,
			status: 'PENDING',
			depixAddress,
		};

		this.logger.log(`🎭 Generated mock validation payment for user ${userId}`);
		this.logger.log(`💳 Payment ID: ${paymentId}`);
		this.logger.log(`💰 Amount: R$ ${amount.toFixed(2)}`);
		this.logger.log(`⏰ Expires: ${paymentData.expiresAt.toISOString()}`);
		this.logger.log(`🏦 DePix Address: ${depixAddress}`);

		return paymentData;
	}

	/**
	 * Generate a realistic mock DePix address
	 */
	generateMockDepixAddress(): string {
		// Generate a realistic Liquid Network address format
		const prefixes = ['lq1', 'VJL', 'Q', 'G', 'H'];
		const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
		const randomPart = Math.random().toString(36).substring(2, 15) +
		                   Math.random().toString(36).substring(2, 15);

		const address = `${prefix}mock${randomPart}validation`;

		this.logger.log(`🔗 Generated mock DePix address: ${address}`);
		return address;
	}

	/**
	 * Create a complete validation payment bypassing EULEN entirely
	 */
	async createValidationPayment(
		userId: string,
		depixAddress?: string
	): Promise<MockQRCodeResponse> {
		this.logger.warn('🚨 USING MOCK PAYMENT SERVICE - EULEN API BYPASSED');
		this.logger.log(`👤 Creating validation payment for user: ${userId}`);
		this.logger.log(`🏦 DePix Address: ${depixAddress || 'generated automatically'}`);

		// Use provided address or generate a mock one
		const finalDepixAddress = depixAddress || this.generateMockDepixAddress();

		// Generate mock payment data
		const paymentData = this.generateMockPaymentData(userId, 1.00);

		// Override depix address if provided
		if (depixAddress) {
			paymentData.depixAddress = depixAddress;
		}

		// Generate transaction ID
		const transactionId = `mock_tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		const response: MockQRCodeResponse = {
			qrCode: paymentData.pixCode,
			qrCodeImage: '', // Will be generated by frontend QRCode library
			transactionId: transactionId,
		};

		this.logger.log(`✅ Mock validation payment created successfully`);
		this.logger.log(`📋 Transaction ID: ${transactionId}`);
		this.logger.log(`📱 QR Code generated: ${paymentData.pixCode.length} characters`);
		this.logger.log(`🎯 Ready for frontend display`);

		return response;
	}

	/**
	 * Simulate payment completion for testing
	 */
	simulatePaymentCompletion(paymentId: string): boolean {
		this.logger.log(`🎬 Simulating payment completion for: ${paymentId}`);

		// In a real scenario, this would be triggered by a webhook
		// For development, we can manually trigger this or use a timer

		return true;
	}

	/**
	 * Generate mock PIX payment for any amount and description
	 */
	async generateMockPixPayment(data: {
		amount: number;
		depixAddress: string;
		description?: string;
		userTaxNumber?: string;
	}): Promise<MockQRCodeResponse> {
		this.logger.warn('🎭 GENERATING MOCK PIX PAYMENT - EULEN API BYPASSED');
		this.logger.log(`💰 Amount: R$ ${data.amount.toFixed(2)}`);
		this.logger.log(`🏦 DePix Address: ${data.depixAddress}`);
		this.logger.log(`📝 Description: ${data.description || 'PIX Payment'}`);

		if (data.userTaxNumber) {
			this.logger.log(`📋 User Tax Number: ${data.userTaxNumber}`);
		}

		const pixCode = this.generateMockPixQrCode(
			data.amount,
			data.description || 'PIX Payment'
		);

		const transactionId = `mock_pix_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		const response: MockQRCodeResponse = {
			qrCode: pixCode,
			qrCodeImage: '', // Frontend will generate this
			transactionId: transactionId,
		};

		this.logger.log(`✅ Mock PIX payment generated successfully`);
		this.logger.log(`📋 Transaction ID: ${transactionId}`);
		this.logger.log(`📱 QR Code: ${pixCode.substring(0, 50)}...`);

		return response;
	}

	/**
	 * Check if we should use mock service based on environment
	 */
	shouldUseMockService(): boolean {
		const isDevelopment = process.env.NODE_ENV === 'development';
		const forceMock = process.env.FORCE_MOCK_PAYMENTS === 'true';

		return isDevelopment || forceMock;
	}

	/**
	 * Get mock service status for health checks
	 */
	getServiceStatus(): {
		active: boolean;
		environment: string;
		reason: string;
	} {
		const isDevelopment = process.env.NODE_ENV === 'development';
		const forceMock = process.env.FORCE_MOCK_PAYMENTS === 'true';

		return {
			active: this.shouldUseMockService(),
			environment: process.env.NODE_ENV || 'unknown',
			reason: forceMock
				? 'Mock payments forced by environment variable'
				: isDevelopment
					? 'Development environment'
					: 'Production environment - mock disabled'
		};
	}
}