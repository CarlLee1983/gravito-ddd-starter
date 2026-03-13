import { DB } from '@gravito/atlas'

export default async function seed(): Promise<void> {
	// 檢查產品是否已存在
	const existing = await DB.table('products').where('id', '=', 'product-1').first()
	if (existing) {
		console.log('ProductSeeder: Products already exist, skipping...')
		return
	}

	// 插入示例產品
	await DB.table('products').insert([
		{
			id: 'product-1',
			name: 'Gravito Pro Wireless Mouse',
			amount: 89.99,
			currency: 'TWD',
			sku: 'MOUSE-001',
			stock_quantity: 100,
			version: 0,
			created_at: new Date(),
			updated_at: new Date(),
		},
		{
			id: 'product-2',
			name: 'Mechanical Keyboard v2',
			amount: 149.00,
			currency: 'TWD',
			sku: 'KEYBOARD-001',
			stock_quantity: 100,
			version: 0,
			created_at: new Date(),
			updated_at: new Date(),
		},
	])

	console.log('ProductSeeder: Seeding complete')
}
