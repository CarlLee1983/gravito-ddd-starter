// biome-ignore lint/suspicious/noExplicitAny: AtlasOrbit 型別由框架提供
type AtlasOrbit = any

import { createTable, dropTableIfExists } from '../MigrationHelper'

/**
 * 建立事件去重紀錄表
 *
 * 用於儲存已處理事件，支援：
 * - 分散式環境中的去重檢查
 * - TTL 自動清理（expires_at）
 * - 事件元數據追蹤
 */
export async function up(db: AtlasOrbit): Promise<void> {
	await createTable(db, 'deduplication_records', (t) => {
		t.id() // UUID 主鍵
		t.string('event_id').notNull().unique() // 事件 ID（唯一索引）
		t.timestamp('processed_at').notNull() // 處理時間
		t.timestamp('expires_at').nullable() // 過期時間（TTL）
		t.json('metadata').nullable() // 元數據（事件源、handler 等）
		t.timestamps() // created_at, updated_at
		t.index('expires_at') // 用於自動清理查詢
	})
}

export async function down(db: AtlasOrbit): Promise<void> {
	await dropTableIfExists(db, 'deduplication_records')
}
