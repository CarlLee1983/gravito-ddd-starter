import { sql } from 'drizzle-orm'
import type { AtlasOrbit } from '@gravito/atlas'

export async function up(db: AtlasOrbit): Promise<void> {
	await db.connection.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT      NOT NULL PRIMARY KEY,
      name        TEXT      NOT NULL,
      email       TEXT      NOT NULL UNIQUE,
      created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function down(db: AtlasOrbit): Promise<void> {
	await db.connection.execute(sql`DROP TABLE IF EXISTS users`)
}
