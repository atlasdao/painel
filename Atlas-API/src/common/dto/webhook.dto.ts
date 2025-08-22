import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class WebhookDepositEventDto {
  @ApiProperty({ 
    description: 'Bank transaction ID from Fitbank',
    example: 'fitbank_E1320335420250228200542878498597'
  })
  @IsString()
  bankTxId: string;

  @ApiProperty({ 
    description: 'Blockchain transaction ID (Liquid Network)',
    example: '4c7dff78eddb910b912f633d83472981fa5b8447859a7c66e49957f2a88167af'
  })
  @IsString()
  blockchainTxID: string;

  @ApiProperty({ 
    description: 'Message from the payer',
    example: 'Message from payer here',
    required: false
  })
  @IsOptional()
  @IsString()
  customerMessage?: string;

  @ApiProperty({ 
    description: 'Name of the payer',
    example: 'John Doe'
  })
  @IsString()
  payerName: string;

  @ApiProperty({ 
    description: 'Eulen User ID of the payer',
    example: 'EU123456789012345'
  })
  @IsString()
  payerEUID: string;

  @ApiProperty({ 
    description: 'Tax number (CPF/CNPJ) of the payer',
    example: '12345678901'
  })
  @IsString()
  payerTaxNumber: string;

  @ApiProperty({ 
    description: 'PIX transaction expiration date',
    example: '2025-03-05T14:33:56-03:00'
  })
  @IsDateString()
  expiration: string;

  @ApiProperty({ 
    description: 'PIX key used for the transaction',
    example: '68fa2517-5c6d-412d-b991-f0762eeec2e3'
  })
  @IsString()
  pixKey: string;

  @ApiProperty({ 
    description: 'QR Code ID from Eulen API',
    example: '01954e29d3337e388d5d1cb846b0d053'
  })
  @IsString()
  qrId: string;

  @ApiProperty({ 
    description: 'Current status of the deposit',
    example: 'depix_sent',
    enum: ['pending', 'paid', 'depix_sent', 'failed', 'expired', 'cancelled']
  })
  @IsString()
  status: string;

  @ApiProperty({ 
    description: 'Transaction value in cents',
    example: 12345
  })
  @IsNumber()
  valueInCents: number;
}

export class WebhookEventResponseDto {
  @ApiProperty({
    description: 'Indicates if the webhook was processed successfully',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Webhook processed successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Transaction ID that was updated',
    example: 'e3ae72bd-da75-4eb8-81b8-2fe5c2d92694',
    required: false
  })
  transactionId?: string;

  @ApiProperty({
    description: 'Previous status of the transaction',
    example: 'PENDING',
    required: false
  })
  previousStatus?: string;

  @ApiProperty({
    description: 'New status of the transaction',
    example: 'COMPLETED',
    required: false
  })
  newStatus?: string;
}