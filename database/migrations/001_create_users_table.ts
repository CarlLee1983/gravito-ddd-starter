// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由框架提供
type AtlasOrbit = any

import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
	await createTable(db, 'users', (t) => {
		t.id()
		t.string('name').notNull()
		t.string('email').notNull().unique()
		t.timestamps()
	})
}

export async function down(db: AtlasOrbit): Promise<void> {
	await dropTableIfExists(db, 'users')
}
