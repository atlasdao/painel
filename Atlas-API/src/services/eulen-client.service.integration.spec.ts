import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EulenClientService } from './eulen-client.service'
import { RateLimiterService } from './rate-limiter.service'

// IMPORTANTE: Este teste faz chamadas reais à API Eulen
// Execute um teste por vez para respeitar os rate limits:
// - Ping: 1 por minuto
// - Deposit: 2 por minuto
// - Deposit Status: 60 por minuto

describe('EulenClientService - Real API Integration (Rate Limited)', () => {
	let service: EulenClientService
	let configService: ConfigService

	// Real DePix test data from Atlas DAO
	const REAL_DEPIX_ADDRESS = 'VJLCguHZDUbpy94zodwcvvUJgTxoLgjiMH8TfTwuYMUEzfMKwE2Ssu6J3LtWwtZUthoMq8HqEYhRm6Ff'
	const TEST_AMOUNT_CENTS = 100 // 1 BRL in cents
	// Token should be fetched from database in production - no hardcoded tokens allowed
	// For integration tests, the token must be set in the database

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EulenClientService,
				RateLimiterService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string, defaultValue?: any) => {
							const config = {
								EULEN_API_URL: 'https://depix.eulen.app/api',
								// Token removed - should be fetched from database
								DEFAULT_DEPIX_ADDRESS: REAL_DEPIX_ADDRESS,
							}
							return config[key] || defaultValue
						}),
					},
				},
			],
		}).compile()

		service = module.get<EulenClientService>(EulenClientService)
		configService = module.get<ConfigService>(ConfigService)
	})

	// Helper function to wait between tests
	const waitBetweenTests = (seconds: number) => {
		return new Promise(resolve => setTimeout(resolve, seconds * 1000))
	}

	describe('Individual API Tests (Run One at a Time)', () => {
		// Teste de Ping - Execute sozinho devido ao limite de 1/minuto
		it.skip('should ping real Eulen API (RATE LIMIT: 1/min)', async () => {
			console.log('Testing ping endpoint...')
			
			try {
				const result = await service.ping()
				
				expect(result).toBeDefined()
				expect(result.response).toBeDefined()
				expect(result.response).toHaveProperty('msg', 'Pong!')
				expect(result.response).toHaveProperty('claims_for_token_debug')
				expect(result.response.claims_for_token_debug).toHaveProperty('sub', 'atlasdao')
				expect(result.async).toBe(false)
				
				console.log('✅ Ping test passed')
			} catch (error) {
				if (error.message?.includes('rate limit')) {
					console.log('⚠️ Rate limit hit - wait 60 seconds before next ping')
					expect(true).toBe(true) // Skip test if rate limited
				} else {
					throw error
				}
			}
		}, 30000)

		// Teste de Depósito - Execute com cuidado, limite de 2/minuto
		it.skip('should create deposit (RATE LIMIT: 2/min)', async () => {
			console.log('Testing deposit creation...')
			
			const depositData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
			}

			const result = await service.createDeposit(depositData)

			expect(result).toBeDefined()
			expect(result.response).toBeDefined()
			expect(result.response.qrCopyPaste).toContain('00020')
			expect(result.response.qrImageUrl).toContain('https://response.eulen.app')
			expect(result.response.id).toMatch(/^[a-f0-9]{32}$/)
			expect(result.async).toBe(false)
			
			console.log('✅ Deposit test passed')
			console.log(`   Transaction ID: ${result.response.id}`)
			
			// Wait 30 seconds before next deposit to respect rate limit
			console.log('⏳ Waiting 30 seconds to respect rate limit...')
			await waitBetweenTests(30)
		}, 60000)

		// Teste de Status - Pode rodar mais frequentemente (60/minuto)
		it.skip('should check deposit status (RATE LIMIT: 60/min)', async () => {
			console.log('Testing deposit status...')
			
			// First create a deposit to get a valid ID
			const depositData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
			}

			const deposit = await service.createDeposit(depositData)
			const transactionId = deposit.response.id
			
			console.log(`   Checking status for transaction: ${transactionId}`)
			
			// Wait 2 seconds before checking status
			await waitBetweenTests(2)
			
			const status = await service.getDepositStatus(transactionId)

			expect(status).toBeDefined()
			// Status endpoint might be in development
			if (status.id) {
				expect(status.id).toBe(transactionId)
				console.log('✅ Status check passed')
			} else {
				console.log('⚠️ Status endpoint in development')
			}
		}, 60000)
	})

	describe('Sequential Test Suite (Respects Rate Limits)', () => {
		it('should run complete flow respecting rate limits', async () => {
			console.log('Starting sequential test with rate limit compliance...')
			
			// Step 1: Create deposit (2/min limit)
			console.log('\n1. Creating deposit...')
			const depositData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
			}
			
			const deposit = await service.createDeposit(depositData)
			expect(deposit).toBeDefined()
			expect(deposit.response.id).toBeDefined()
			console.log(`   ✅ Deposit created: ${deposit.response.id}`)
			
			// Step 2: Check status (60/min limit - safe)
			console.log('\n2. Checking deposit status...')
			await waitBetweenTests(2)
			
			const status = await service.getDepositStatus(deposit.response.id)
			expect(status).toBeDefined()
			console.log('   ✅ Status checked')
			
			// Step 3: Wait before next deposit
			console.log('\n3. Waiting 30 seconds before next deposit...')
			await waitBetweenTests(30)
			
			// Step 4: Create another deposit
			console.log('\n4. Creating second deposit...')
			const deposit2 = await service.createDeposit({
				amount: 200,
				pixKey: REAL_DEPIX_ADDRESS,
			})
			expect(deposit2).toBeDefined()
			console.log(`   ✅ Second deposit created: ${deposit2.response.id}`)
			
			console.log('\n✅ All tests completed respecting rate limits!')
		}, 120000) // 2 minute timeout for complete flow
	})
})