import { DB } from '@gravito/atlas'

export default async function seed(): Promise<void> {
	const existing = await DB.table('posts')
		.where('id', '=', '00000000-0000-0000-0000-000000000001')
		.first()

	if (existing) {
		console.log('PostSeeder: Post already exists, skipping...')
		return
	}

	await DB.table('posts').insert({
		id: '00000000-0000-0000-0000-000000000001',
		title: 'Sample Post',
		author_id: '00000000-0000-0000-0000-000000000001',
		content: 'This is a sample post.',
		created_at: new Date().toISOString(),
	})
	console.log('PostSeeder: Seeding complete')
}
