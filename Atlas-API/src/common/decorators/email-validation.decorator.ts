import {
	registerDecorator,
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { EmailDomainSyncService } from '../../services/email-domain-sync.service';

@ValidatorConstraint({ name: 'isNotDisposableEmail', async: true })
@Injectable()
export class IsNotDisposableEmailConstraint implements ValidatorConstraintInterface {
	constructor(private readonly emailDomainSyncService: EmailDomainSyncService) {}

	async validate(email: string, args: ValidationArguments) {
		console.log('[IsNotDisposableEmail] Validator called with email:', email);

		if (!email || typeof email !== 'string') {
			console.log('[IsNotDisposableEmail] Invalid email type, passing to other validators');
			return true; // Let other validators handle basic validation
		}

		try {
			// Check if email uses a blocked disposable domain
			console.log('[IsNotDisposableEmail] Checking if email is blocked:', email);
			const isBlocked = await this.emailDomainSyncService.isEmailBlocked(email);
			console.log('[IsNotDisposableEmail] Email blocked status:', isBlocked);
			return !isBlocked;
		} catch (error) {
			// If there's an error checking (e.g., database down), fail open
			// This ensures the registration doesn't break due to validation service issues
			console.log('[IsNotDisposableEmail] Error during validation, failing open:', error);
			return true;
		}
	}

	defaultMessage(args: ValidationArguments) {
		return 'Temporary email addresses are not allowed. Please use a permanent email address.';
	}
}

export function IsNotDisposableEmail(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsNotDisposableEmailConstraint,
		});
	};
}