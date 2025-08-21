import { IsNumber, IsString, IsOptional, IsDate, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentLinkDto {
  @ApiProperty({ 
    description: 'Amount to be paid',
    example: 100.50
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ 
    description: 'Wallet address to receive payment',
    example: 'VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG'
  })
  @IsString()
  walletAddress: string;

  @ApiPropertyOptional({ 
    description: 'Payment description',
    example: 'Product payment'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Expiration date for the payment link',
    example: '2024-12-31T23:59:59Z'
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}

export class PaymentLinkResponseDto {
  id: string;
  userId: string;
  shortCode: string;
  amount: number;
  walletAddress: string;
  description?: string;
  currentQrCode?: string;
  qrCodeGeneratedAt?: Date;
  lastPaymentId?: string;
  totalPayments: number;
  totalAmount: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}