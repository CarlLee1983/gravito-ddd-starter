// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由框架提供
type AtlasOrbit = any

import { rawSQL } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
	// 添加 items 欄位用於存儲購物車項目（JSON 格式）
	await rawSQL(db, `ALTER TABLE "carts" ADD COLUMN "items" jsonb DEFAULT '[]'::jsonb`)
}

export async function down(db: AtlasOrbit): Promise<void> {
	// 移除 items 欄位
	await rawSQL(db, `ALTER TABLE "carts" DROP COLUMN "items"`)
}
