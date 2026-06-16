import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
	const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;

	await prisma.reservation.deleteMany();
	await prisma.inventory.deleteMany();
	await prisma.product.deleteMany();
	await prisma.warehouse.deleteMany();
	await prisma.user.deleteMany();

	const admin = await prisma.user.create({
		data: {
			email: 'admin@wtec.com',
			passwordHash: await bcrypt.hash('Admin@123', rounds),
			role: 'Admin',
		},
	});

	const operator = await prisma.user.create({
		data: {
			email: 'operator@wtec.com',
			passwordHash: await bcrypt.hash('Operator@123', rounds),
			role: 'Operator',
		},
	});

	const cabo = await prisma.product.create({
		data: {
			sku: 'a1000000-0000-0000-0000-000000000001',
			name: 'Cabo Solar 10mm²',
		},
	});

	const viga = await prisma.product.create({
		data: {
			sku: 'a1000000-0000-0000-0000-000000000002',
			name: 'Viga I 6m',
		},
	});

	const tubo = await prisma.product.create({
		data: {
			sku: 'a1000000-0000-0000-0000-000000000003',
			name: 'Tubo de Torque',
		},
	});

	const inativo = await prisma.product.create({
		data: {
			sku: 'a1000000-0000-0000-0000-000000000004',
			name: 'Produto Inativo',
			isActive: false,
		},
	});

	const semEstoque = await prisma.product.create({
		data: {
			sku: 'a1000000-0000-0000-0000-000000000005',
			name: 'Sem Estoque',
		},
	});

	const central = await prisma.warehouse.create({
		data: {
			name: 'Armazém Central',
			location: 'São Paulo, SP',
		},
	});

	const sul = await prisma.warehouse.create({
		data: {
			name: 'Armazém Sul',
			location: 'Curitiba, PR',
		},
	});

	const inativoWh = await prisma.warehouse.create({
		data: {
			name: 'Armazém Inativo',
			location: 'Rio de Janeiro, RJ',
			isActive: false,
		},
	});

	await prisma.inventory.create({
		data: { productId: cabo.id, warehouseId: central.id, quantity: 200 },
	});

	await prisma.inventory.create({
		data: { productId: cabo.id, warehouseId: sul.id, quantity: 100 },
	});

	await prisma.inventory.create({
		data: { productId: viga.id, warehouseId: central.id, quantity: 50 },
	});

	await prisma.inventory.create({
		data: { productId: viga.id, warehouseId: sul.id, quantity: 30 },
	});

	await prisma.inventory.create({
		data: { productId: tubo.id, warehouseId: central.id, quantity: 10 },
	});

	await prisma.inventory.create({
		data: { productId: tubo.id, warehouseId: sul.id, quantity: 3 },
	});

	await prisma.inventory.create({
		data: { productId: semEstoque.id, warehouseId: central.id, quantity: 0 },
	});

	await prisma.reservation.create({
		data: {
			productId: cabo.id,
			warehouseId: central.id,
			quantity: 20,
			status: 'Pending',
		},
	});

	await prisma.reservation.create({
		data: {
			productId: viga.id,
			warehouseId: sul.id,
			quantity: 5,
			status: 'Confirmed',
		},
	});

	await prisma.reservation.create({
		data: {
			productId: tubo.id,
			warehouseId: central.id,
			quantity: 3,
			status: 'Cancelled',
		},
	});

	console.log('Seed completed successfully.');
	console.log(`  Users: ${admin.email} (Admin), ${operator.email} (Operator)`);
	console.log(`  Products: 5`);
	console.log(`  Warehouses: 3`);
	console.log(`  Inventory records: 7`);
	console.log(`  Reservations: 3`);
}

main()
	.catch((e) => {
		console.error('Seed failed:', e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
