/**
 * @file 003_add_password_to_users_table.ts
 * @description 添加密碼雜湊欄位到 users 表
 *
 * 用於支持認證功能。password_hash 允許 null 以支持舊記錄遷移。
 */

// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由框架提供
type AtlasOrbit = any

export async function up(db: AtlasOrbit): Promise<void> {
	await db.raw(`
		ALTER TABLE users
		ADD COLUMN password_hash TEXT NULL
	`)
}

export async function down(db: AtlasOrbit): Promise<void> {
	await db.raw(`
		ALTER TABLE users
		DROP COLUMN password_hash
	`)
}
