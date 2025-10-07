import {
	IsString,
	IsNumber,
	IsOptional,
	IsBoolean,
	IsArray,
	IsDateString,
	Min,
	Max,
	IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCouponDto {
	@IsString()
	code: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsNumber()
	@Min(0)
	@Max(100)
	@Type(() => Number)
	discountPercentage: number;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	maxUses?: number;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	maxUsesPerUser?: number = 1;

	@IsOptional()
	@IsDateString()
	validFrom?: string;

	@IsOptional()
	@IsDateString()
	validUntil?: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	minAmount?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	maxAmount?: number;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	allowedMethods?: string[] = ['PIX', 'DEPIX'];

	@IsOptional()
	@IsBoolean()
	isActive?: boolean = true;
}

export class UpdateCouponDto {
	@IsOptional()
	@IsString()
	code?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	@Type(() => Number)
	discountPercentage?: number;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	maxUses?: number;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	maxUsesPerUser?: number;

	@IsOptional()
	@IsDateString()
	validFrom?: string;

	@IsOptional()
	@IsDateString()
	validUntil?: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	minAmount?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	maxAmount?: number;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	allowedMethods?: string[];

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}

export class ValidateCouponDto {
	@IsString()
	code: string;

	@IsNumber()
	@Min(0)
	@Type(() => Number)
	amount: number;

	@IsString()
	@IsEnum(['PIX', 'DEPIX'])
	method: string;
}
