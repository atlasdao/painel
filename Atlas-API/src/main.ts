import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { SecurityConfig } from './common/config/security.config';

async function bootstrap() {
	const logger = new Logger('Bootstrap');
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		logger: ['error', 'warn', 'log'],
		bodyParser: false, // Disable default body parser to configure custom limits
	});

	// Enable dependency injection for class-validator constraints
	useContainer(app.select(AppModule), { fallbackOnErrors: true });

	const configService = app.get(ConfigService);
	const port = configService.get<number>('PORT', 19997);
	const nodeEnv = configService.get<string>('NODE_ENV', 'development');
	const isProduction = nodeEnv === 'production';

	// Security middleware
	app.use(
		helmet({
			contentSecurityPolicy: isProduction
				? SecurityConfig.headers.contentSecurityPolicy
				: false,
			hsts: isProduction
				? SecurityConfig.headers.strictTransportSecurity
				: false,
			crossOriginEmbedderPolicy: false,
		}),
	);

	// Compression
	app.use(
		compression({
			filter: (req, res) => {
				if (req.headers['x-no-compression']) {
					return false;
				}
				return compression.filter(req, res);
			},
			level: 6,
		}),
	);

	// Configure body parser with higher limits for image uploads
	app.use(express.json({ limit: '50mb' }));
	app.use(express.urlencoded({ limit: '50mb', extended: true }));

	// CORS configuration
	const corsOptions = {
		origin: (origin, callback) => {
			// In production, validate against whitelist
			if (!isProduction || !origin) {
				callback(null, true);
			} else {
				const allowedOrigins = configService.get<string[]>('ALLOWED_ORIGINS', [
					'http://localhost:11337',
				]);
				if (allowedOrigins.includes(origin)) {
					callback(null, true);
				} else {
					callback(new Error('Not allowed by CORS'));
				}
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-API-Key',
			'X-Request-ID',
			'X-Account-Id',
			'X-Collaborator-Id',
			'X-Account-Type',
		],
		exposedHeaders: [
			'X-RateLimit-Limit',
			'X-RateLimit-Remaining',
			'X-RateLimit-Reset',
		],
		maxAge: 86400,
		optionsSuccessStatus: 200,
	};

	app.enableCors(corsOptions);

	// Security headers
	app.use((req, res, next) => {
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('X-XSS-Protection', '1; mode=block');
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
		res.setHeader(
			'Permissions-Policy',
			'geolocation=(), microphone=(), camera=()',
		);

		// Remove fingerprinting headers
		res.removeHeader('X-Powered-By');

		next();
	});

	// Trust proxy for correct IP detection
	app.set('trust proxy', 1);

	// API Versioning
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1',
	});

	// Global prefix
	app.setGlobalPrefix('api', {
		exclude: [
			'health',
			'health/ready',
			'health/live',
			{ path: 'webhooks/*', method: RequestMethod.ALL },
		],
	});

	// Global pipes
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
			disableErrorMessages: isProduction,
			validationError: {
				target: false,
				value: false,
			},
		}),
	);

	// Global filters
	app.useGlobalFilters(new HttpExceptionFilter());

	// Global interceptors
	app.useGlobalInterceptors(new LoggingInterceptor());

	// Global guards
	app.useGlobalGuards(new RateLimitGuard(app.get('Reflector')));

	// Graceful shutdown
	app.enableShutdownHooks();

	process.on('SIGTERM', async () => {
		logger.log('SIGTERM signal received: closing HTTP server');
		await app.close();
	});

	process.on('SIGINT', async () => {
		logger.log('SIGINT signal received: closing HTTP server');
		await app.close();
	});

	await app.listen(port, '0.0.0.0');

	logger.log(`🚀 Application is running in ${nodeEnv} mode`);
	logger.log(`🚀 Listening on port ${port}`);
	logger.log(`🚀 API available at http://localhost:${port}/api`);
	logger.log(`🚀 Health check at http://localhost:${port}/health`);

	if (!isProduction) {
		logger.warn(
			'⚠️  Running in development mode - some security features are relaxed',
		);
	}
}

bootstrap().catch((err) => {
	const logger = new Logger('Bootstrap');
	logger.error('Failed to start application:', err);
	process.exit(1);
});
