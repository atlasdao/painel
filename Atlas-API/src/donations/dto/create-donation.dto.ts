import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DonationMethod } from '@prisma/client';

export class CreateDonationDto {
  @IsOptional()
  @IsString()
  donorName?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(DonationMethod)
  paymentMethod: DonationMethod;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}