/**
 * @file DatabaseEventDeduplicator.ts
 * @description 數據庫事件去重實現
 *
 * 用於需要長期保留去重記錄的場景。
 * 使用數據庫表儲存已處理事件，支援 TTL 和自動清理。
 *
 * **特性**：
 * - O(1) 查詢性能（索引查詢）
 * - TTL 自動清理（CRON Job）
 * - 事件元數據追蹤
 * - 審計日誌能力
 * - 跨進程共享狀態
 *
 * **適用場景**：
 * - 需要長期保留審計日誌
 * - 數據庫已是核心基礎設施
 * - 不想額外部署 Redis
 *
 * @public
 */

import type { IEventDeduplicator } from '../../Application/Ports/IEventDeduplicator'
import type { IDatabaseAccess } from '../Ports/Database/IDatabaseAccess'
import { v4 as uuidv4 } from 'uuid'

export interface DeduplicationRecord {
	id: string
	event_id: string
	processed_at: string
	expires_at?: string
	metadata?: Record<string, unknown>
	created_at: string
	updated_at: string
}

export class DatabaseEventDeduplicator implements IEventDeduplicator {
	private readonly tableName = 'deduplication_records'
	private timestampCounter = 0

	constructor(
		private readonly db: IDatabaseAccess,
		private readonly ttlSeconds = 86400 // 預設 24 小時
	) {}

	/**
	 * 標記事件為已處理
	 */
	async markProcessed(eventId: string, metadata?: Record<string, unknown>): Promise<void> {
		try {
			// 使用計數器確保 created_at 的唯一性和遞增性，用於 DESC 排序時的穩定排序
			const nowMs = Date.now()
			const baseTime = new Date(nowMs)
			const now = new Date(baseTime.getTime() + this.timestampCounter).toISOString()
			this.timestampCounter++

			const expiresAt = new Date(nowMs + this.ttlSeconds * 1000).toISOString()

			await this.db
				.table(this.tableName)
				.insert({
					id: uuidv4(),
					event_id: eventId,
					processed_at: now,
					expires_at: expiresAt,
					metadata: metadata ? JSON.stringify(metadata) : null,
					created_at: now,
					updated_at: now,
				})
		} catch (error) {
			// 處理唯一約束衝突（事件已存在）
			const errorMsg = String(error)
			if (errorMsg.includes('unique') || errorMsg.includes('UNIQUE')) {
				// 事件已存在，視為已處理
				return
			}

			throw new Error(`Failed to mark event ${eventId} as processed: ${String(error)}`)
		}
	}

	/**
	 * 檢查事件是否已處理
	 */
	async isProcessed(eventId: string): Promise<boolean> {
		try {
			const results = await this.db
				.table(this.tableName)
				.where('event_id', '=', eventId)
				.where('expires_at', '>', new Date().toISOString()) // 未過期
				.select(['id'])

			return results && results.length > 0
		} catch (error) {
			// 數據庫連線失敗時，傾向於重複執行（安全優先）
			console.warn(`Failed to check event ${eventId} processing status:`, error)
			return false
		}
	}

	/**
	 * 移除事件記錄
	 */
	async remove(eventId: string): Promise<boolean> {
		try {
			// 先檢查記錄是否存在
			const results = await this.db.table(this.tableName).where('event_id', '=', eventId).select(['id'])

			if (!results || results.length === 0) {
				return false
			}

			// 刪除記錄
			await this.db.table(this.tableName).where('event_id', '=', eventId).delete()

			return true
		} catch (error) {
			console.warn(`Failed to remove event ${eventId}:`, error)
			return false
		}
	}

	/**
	 * 清空所有事件記錄
	 */
	async clear(): Promise<void> {
		try {
			await this.db.table(this.tableName).delete()
		} catch (error) {
			console.warn('Failed to clear event deduplicator:', error)
		}
	}

	/**
	 * 獲取已處理事件計數
	 */
	async getProcessedCount(): Promise<number> {
		try {
			const results = await this.db
				.table(this.tableName)
				.where('expires_at', '>', new Date().toISOString())
				.select(['id'])

			return results ? results.length : 0
		} catch (error) {
			console.warn('Failed to get processed count:', error)
			return 0
		}
	}

	/**
	 * 列出已處理的事件 ID（可限制結果數量）
	 */
	async listProcessedEventIds(limit = 1000): Promise<string[]> {
		try {
			const results = await this.db
				.table(this.tableName)
				.where('expires_at', '>', new Date().toISOString())
				.orderBy('created_at', 'DESC')
				.orderBy('id', 'DESC')
				.limit(limit)
				.select(['event_id'])

			return results ? results.map((r: any) => r.event_id) : []
		} catch (error) {
			console.warn('Failed to list processed event IDs:', error)
			return []
		}
	}

	/**
	 * 清理過期的事件記錄（應由 CRON Job 定期調用）
	 *
	 * @returns 刪除的記錄數量
	 */
	async cleanupExpiredRecords(): Promise<number> {
		try {
			const now = new Date().toISOString()

			// 先查詢要刪除的記錄數量
			const expiredRecords = await this.db
				.table(this.tableName)
				.where('expires_at', '<=', now)
				.select(['id'])

			const count = expiredRecords ? expiredRecords.length : 0

			// 刪除過期記錄
			if (count > 0) {
				await this.db
					.table(this.tableName)
					.where('expires_at', '<=', now)
					.delete()
			}

			return count
		} catch (error) {
			console.warn('Failed to cleanup expired records:', error)
			return 0
		}
	}

	/**
	 * 取得統計資訊
	 */
	async getStats(): Promise<{
		total: number
		active: number
		expired: number
		oldestRecord?: string
	}> {
		try {
			const now = new Date().toISOString()

			// 總計數
			const totalResults = await this.db.table(this.tableName).select(['id'])
			const total = totalResults ? totalResults.length : 0

			// 活躍數（未過期）
			const activeResults = await this.db
				.table(this.tableName)
				.where('expires_at', '>', now)
				.select(['id'])
			const active = activeResults ? activeResults.length : 0

			// 已過期數
			const expiredResults = await this.db
				.table(this.tableName)
				.where('expires_at', '<=', now)
				.select(['id'])
			const expired = expiredResults ? expiredResults.length : 0

			// 最舊的記錄
			const oldestResults = await this.db
				.table(this.tableName)
				.orderBy('created_at', 'ASC')
				.limit(1)
				.select(['created_at'])
			const oldestRecord = oldestResults && oldestResults.length > 0 ? (oldestResults[0].created_at as string) : undefined

			return {
				total,
				active,
				expired,
				oldestRecord,
			}
		} catch (error) {
			console.warn('Failed to get statistics:', error)
			return {
				total: 0,
				active: 0,
				expired: 0,
			}
		}
	}
}
