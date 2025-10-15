import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export enum CommerceApplicationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DEPOSIT_PENDING = 'DEPOSIT_PENDING',
  ACTIVE = 'ACTIVE',
}

export class CreateCommerceApplicationDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  productOrService: string; // Qual produto ou serviço você vende?

  @IsString()
  @IsNotEmpty()
  averagePrices: string; // Quais são os valores médios dos seus produtos ou serviços?

  @IsString()
  @IsNotEmpty()
  monthlyPixSales: string; // Qual a quantidade e volume mensal médio de vendas via Pix?

  @IsString()
  @IsNotEmpty()
  marketTime: string; // Quanto tempo de mercado você/sua empresa tem?

  @IsString()
  @IsNotEmpty()
  references: string; // Você tem grupos, comunidades ou páginas de referência?

  @IsString()
  @IsNotEmpty()
  refundRate: string; // Qual é sua taxa de reembolso?

  @IsString()
  @IsNotEmpty()
  refundProcess: string; // Como você resolve reembolsos e disputas (MEDs)?

  @IsString()
  @IsNotEmpty()
  businessProof: string; // Como podemos comprovar que este negócio pertence a você?

  @IsString()
  @IsNotEmpty()
  contactInfo: string; // Tem Telegram ou SimpleX para contato mais rápido?

  @IsBoolean()
  @IsOptional()
  acceptTerms?: boolean;
}

export class UpdateApplicationStatusDto {
  @IsEnum(CommerceApplicationStatus)
  status: CommerceApplicationStatus;

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class ProcessDepositDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}