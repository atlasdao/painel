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
  businessType: string;

  @IsString()
  @IsNotEmpty()
  monthlyVolume: string;

  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @IsString()
  @IsNotEmpty()
  targetAudience: string;

  @IsString()
  @IsNotEmpty()
  hasPhysicalStore: string;

  @IsString()
  @IsNotEmpty()
  socialMedia: string;

  @IsString()
  @IsNotEmpty()
  businessObjective: string;

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