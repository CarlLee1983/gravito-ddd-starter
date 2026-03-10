import { DB } from '@gravito/atlas'

export default async function seed(): Promise<void> {
	await DB.table('posts').insert({
		id: '00000000-0000-0000-0000-000000000001',
		name: 'Sample Post',
		created_at: new Date().toISOString(),
	})
	console.log('PostSeeder: Seeding complete')
}
