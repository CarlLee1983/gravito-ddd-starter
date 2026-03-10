/**
 * Migration Helper - 簡化 Laravel 風格的 migration 編寫
 *
 * 提供便利函數讓 migration 檔案更清晰地使用 SchemaBuilder
 */

// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由 @gravito/atlas CLI 框架提供
type AtlasOrbit = any

import { schema, type ITableBuilder } from './SchemaBuilder'

/**
 * 在 migration 中建立表
 *
 * @example
 * ```typescript
 * await createTable(db, 'users', (t) => {
 *   t.id()
 *   t.string('name').notNull()
 *   t.timestamps()
 * })
 * ```
 */
export async function createTable(
	db: AtlasOrbit,
	table: string,
	callback: (t: ITableBuilder) => void,
): Promise<void> {
	const builder = schema().create(table, callback)
	const sqlStatement = builder.toSQL()

	// 直接執行 SQL 語句（Atlas 的連接介面支援原始 SQL）
	// biome-ignore lint/suspicious/noExplicitAny: 參數型別由框架決定
	await (db.connection.execute as any)(sqlStatement)
}

/**
 * 在 migration 中刪除表
 *
 * @example
 * ```typescript
 * await dropTable(db, 'users')
 * ```
 */
export async function dropTable(db: AtlasOrbit, table: string): Promise<void> {
	const sqlStatement = schema().drop(table)
	// biome-ignore lint/suspicious/noExplicitAny: 參數型別由框架決定
	await (db.connection.execute as any)(sqlStatement)
}

/**
 * 在 migration 中刪除表（如果存在）
 *
 * @example
 * ```typescript
 * await dropTableIfExists(db, 'users')
 * ```
 */
export async function dropTableIfExists(db: AtlasOrbit, table: string): Promise<void> {
	const sqlStatement = schema().dropIfExists(table)
	// biome-ignore lint/suspicious/noExplicitAny: 參數型別由框架決定
	await (db.connection.execute as any)(sqlStatement)
}

/**
 * 執行原始 SQL 語句（用於自訂邏輯）
 *
 * @example
 * ```typescript
 * await rawSQL(db, 'ALTER TABLE users ADD INDEX idx_email (email)')
 * ```
 */
export async function rawSQL(db: AtlasOrbit, sqlStatement: string): Promise<void> {
	// biome-ignore lint/suspicious/noExplicitAny: 參數型別由框架決定
	await (db.connection.execute as any)(sqlStatement)
}
