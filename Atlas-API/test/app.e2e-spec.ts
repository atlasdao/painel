import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
const request = require('supertest');

describe('AppController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api');
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	it('/api (GET) - should return health status', () => {
		return request(app.getHttpServer())
			.get('/api')
			.expect(200)
			.expect((res) => {
				expect(res.body).toHaveProperty('status', 'healthy');
				expect(res.body).toHaveProperty('message', 'Depix API is running');
				expect(res.body).toHaveProperty('timestamp');
			});
	});
});
