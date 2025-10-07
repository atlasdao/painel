import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding discount coupons...');

	const coupons = [
		{
			code: 'BEMVINDO10',
			description: 'Cupom de boas-vindas - 10% de desconto',
			discountPercentage: 10,
			maxUsesPerUser: 1,
			validFrom: new Date(),
			validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
			minAmount: 50,
			isActive: true,
			allowedMethods: ['PIX', 'DEPIX'],
		},
		{
			code: 'DESCONTO20',
			description: 'Desconto especial de 20%',
			discountPercentage: 20,
			maxUses: 100,
			maxUsesPerUser: 2,
			validFrom: new Date(),
			validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
			minAmount: 100,
			maxAmount: 1000,
			isActive: true,
			allowedMethods: ['PIX'],
		},
		{
			code: 'DEPIXFREE',
			description: 'Taxa grátis para DePix',
			discountPercentage: 100,
			maxUses: 50,
			maxUsesPerUser: 1,
			validFrom: new Date(),
			validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
			minAmount: 200,
			isActive: true,
			allowedMethods: ['DEPIX'],
		},
		{
			code: 'VIP50',
			description: 'Cupom VIP - 50% de desconto',
			discountPercentage: 50,
			maxUses: 10,
			maxUsesPerUser: 1,
			validFrom: new Date(),
			validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
			minAmount: 500,
			isActive: true,
			allowedMethods: ['PIX', 'DEPIX'],
		},
		{
			code: 'TESTE5',
			description: 'Cupom de teste - 5% de desconto',
			discountPercentage: 5,
			maxUsesPerUser: 5,
			validFrom: new Date(),
			isActive: true,
			allowedMethods: ['PIX', 'DEPIX'],
		},
	];

	for (const couponData of coupons) {
		try {
			const existingCoupon = await prisma.discountCoupon.findUnique({
				where: { code: couponData.code },
			});

			if (!existingCoupon) {
				const coupon = await prisma.discountCoupon.create({
					data: couponData,
				});
				console.log(
					`✅ Created coupon: ${coupon.code} - ${coupon.description}`,
				);
			} else {
				console.log(`⏭️  Coupon already exists: ${couponData.code}`);
			}
		} catch (error) {
			console.error(`❌ Error creating coupon ${couponData.code}:`, error);
		}
	}

	console.log('✅ Seeding completed!');
}

main()
	.catch((e) => {
		console.error('Error seeding coupons:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
