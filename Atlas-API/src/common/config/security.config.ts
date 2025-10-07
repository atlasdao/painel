export const SecurityConfig = {
	// Rate limiting
	rateLimit: {
		global: {
			windowMs: 15 * 60 * 1000, // 15 minutes
			max: 100, // limit each IP to 100 requests per windowMs
		},
		auth: {
			windowMs: 15 * 60 * 1000,
			max: 5, // limit login attempts
		},
		api: {
			windowMs: 1 * 60 * 1000, // 1 minute
			max: 60, // 60 requests per minute for API endpoints
		},
		withdrawal: {
			windowMs: 60 * 60 * 1000, // 1 hour
			max: 10, // 10 withdrawal requests per hour
		},
	},

	// JWT Configuration
	jwt: {
		accessTokenExpiry: '1d',
		refreshTokenExpiry: '7d',
		passwordResetTokenExpiry: '1h',
	},

	// Password Policy
	password: {
		minLength: 8,
		requireUppercase: true,
		requireLowercase: true,
		requireNumbers: true,
		requireSpecialChars: false,
		maxAttempts: 5,
		lockoutDuration: 30 * 60 * 1000, // 30 minutes
	},

	// API Key Configuration
	apiKey: {
		length: 32,
		prefix: 'atls_',
		rotationPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
	},

	// Security Headers
	headers: {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", 'data:', 'https:'],
			},
		},
		strictTransportSecurity: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true,
		},
	},

	// Encryption
	encryption: {
		algorithm: 'aes-256-gcm',
		saltRounds: 12,
	},

	// Session Configuration
	session: {
		secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'development'
			? 'dev-session-secret-change-in-production'
			: (() => { throw new Error('SESSION_SECRET environment variable is required in production'); })()),
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict' as const,
	},

	// Input Validation
	validation: {
		maxPayloadSize: '10mb',
		maxFieldSize: 50 * 1024, // 50KB
		maxFiles: 10,
		allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
		maxFileSize: 5 * 1024 * 1024, // 5MB
	},

	// Anti-fraud
	antifraud: {
		maxTransactionsPerDay: 100,
		maxAmountPerTransaction: 50000,
		maxAmountPerDay: 200000,
		suspiciousPatternThreshold: 0.8,
		blocklistedIPs: [],
		blocklistedEmails: [],
	},

	// Audit
	audit: {
		enabled: true,
		logLevel: 'info',
		retentionDays: 90,
		sensitiveFields: ['password', 'apiKey', 'token', 'secret', 'card'],
	},
};
