// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由框架提供
type AtlasOrbit = any

import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
	await createTable(db, 'posts', (t) => {
		t.id()
		t.string('title').notNull()
		t.text('content')
		t.string('author_id').notNull()
		t.timestamps()
	})
}

export async function down(db: AtlasOrbit): Promise<void> {
	await dropTableIfExists(db, 'posts')
}
