type AtlasOrbit = any
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
  await createTable(db, 'products', (t) => {
    t.id()
    t.string('name').notNull()
    t.decimal('amount', 12, 2).notNull()
    t.string('currency', 3).default('TWD').notNull()
    t.string('sku').unique().notNull()
    t.integer('stock_quantity').default(0).notNull()
    t.integer('version').default(0).notNull()
    t.timestamps()
  })
}

export async function down(db: AtlasOrbit): Promise<void> {
  await dropTableIfExists(db, 'products')
}
