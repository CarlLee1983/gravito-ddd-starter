// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由框架提供
type AtlasOrbit = any

import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
	await createTable(db, 'carts', (t) => {
		t.id()
		t.string('user_id').notNull().unique()
		t.integer('version').default(0).notNull()
		t.timestamps()
	})
}

export async function down(db: AtlasOrbit): Promise<void> {
	await dropTableIfExists(db, 'carts')
}
