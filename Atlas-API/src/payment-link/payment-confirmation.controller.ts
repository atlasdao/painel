import {
	Controller,
	Get,
	Param,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Payment Confirmation')
@Controller('payment-confirmation')
export class PaymentConfirmationController {
	private readonly logger = new Logger(PaymentConfirmationController.name);

	constructor(private readonly prisma: PrismaService) {}

	@Public()
	@Get(':transactionId')
	@ApiOperation({ summary: 'Get payment confirmation details' })
	@ApiResponse({
		status: 200,
		description: 'Payment confirmation details retrieved successfully',
	})
	async getPaymentConfirmation(@Param('transactionId') transactionId: string) {
		try {
			this.logger.log(
				`📋 Fetching payment confirmation for transaction: ${transactionId}`,
			);

			// Find transaction by ID or external ID
			const transaction = await this.prisma.transaction.findFirst({
				where: {
					OR: [
						{ id: transactionId },
						{ externalId: transactionId },
					],
					status: 'COMPLETED',
				},
				include: {
					user: {
						select: {
							email: true,
						},
					},
				},
			});

			if (!transaction) {
				this.logger.warn(
					`⚠️ Transaction not found or not paid: ${transactionId}`,
				);
				throw new HttpException(
					'Pagamento não encontrado ou ainda não foi confirmado',
					HttpStatus.NOT_FOUND,
				);
			}

			// Parse metadata safely
			let metadata: any = {};
			try {
				metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
			} catch (error) {
				this.logger.error('Error parsing transaction metadata:', error);
			}

			// Extract payer information from metadata
			const webhookEvent = metadata.webhookEvent || {};
			const paymentLinkData = metadata.paymentLinkData || {};

			// Format response
			const response = {
				id: transaction.id,
				amount: transaction.amount,
				description: paymentLinkData.description || metadata.description || 'Pagamento PIX',
				status: 'paid',
				createdAt: transaction.createdAt.toISOString(),
				paidAt: transaction.processedAt?.toISOString() || transaction.updatedAt.toISOString(),
				buyerName: webhookEvent.payerName || metadata.buyerName,
				buyerEmail: transaction.user?.email,
				buyerDocument: webhookEvent.payerTaxNumber || metadata.buyerDocument,
				transactionId: transaction.externalId || transaction.id,
				externalId: transaction.externalId,
				method: 'PIX',
				metadata: {
					payerName: webhookEvent.payerName,
					payerTaxNumber: webhookEvent.payerTaxNumber,
					bankTxId: webhookEvent.bankTxId,
					valueInCents: webhookEvent.valueInCents,
				},
			};

			this.logger.log(
				`✅ Payment confirmation retrieved for transaction: ${transactionId}`,
			);

			return response;
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}

			this.logger.error(
				`❌ Error fetching payment confirmation: ${error.message}`,
			);
			throw new HttpException(
				'Erro ao buscar confirmação de pagamento',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
