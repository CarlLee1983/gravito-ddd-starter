/**
 * @file RedisEventDeduplicator.ts
 * @description Redis 事件去重實現
 *
 * 用於分散式環境的事件去重，支援多進程共享。
 * 使用 Redis Set 存儲已處理事件 ID，支援 TTL 和批量操作。
 *
 * **特性**：
 * - O(1) 查詢性能
 * - TTL 自動清理過期記錄
 * - 跨進程共享去重狀態
 * - 防止重複執行（冪等性）
 * - 適合高併發場景
 *
 * **限制**：
 * - Redis 連線可用性依賴
 * - 基於記憶體的存儲（除非 Redis 持久化啟用）
 * - 分散式環境需要共享 Redis 實例
 *
 * @public
 */

import type { IEventDeduplicator } from '../../Application/Ports/IEventDeduplicator'
import type { IRedisService } from '../Ports/Messaging/IRedisService'

export class RedisEventDeduplicator implements IEventDeduplicator {
	private readonly processedPrefix = 'dedup:event:'
	private readonly allProcessedKey = 'dedup:all'

	constructor(
		private readonly redis: IRedisService,
		private readonly ttlSeconds = 86400 // 預設 24 小時
	) {}

	/**
	 * 生成事件紀錄鍵
	 */
	private getKey(eventId: string): string {
		return this.processedPrefix + eventId
	}

	/**
	 * 標記事件為已處理
	 */
	async markProcessed(eventId: string): Promise<void> {
		try {
			const key = this.getKey(eventId)

			// 儲存到 Redis（支援 TTL）
			await this.redis.set(key, JSON.stringify({ processedAt: Date.now() }), this.ttlSeconds)

			// 同時記錄到所有已處理事件的列表（用於統計）
			await this.redis.rpush(this.allProcessedKey, eventId)
		} catch (error) {
			// Redis 連線失敗時，優雅降級（拋出異常讓調用者處理）
			throw new Error(`Failed to mark event ${eventId} as processed: ${String(error)}`)
		}
	}

	/**
	 * 檢查事件是否已處理
	 */
	async isProcessed(eventId: string): Promise<boolean> {
		try {
			const key = this.getKey(eventId)
			return await this.redis.exists(key)
		} catch (error) {
			// Redis 連線失敗時，假設未處理（傾向於重複執行而非丟失事件）
			console.warn(`Failed to check event ${eventId} processing status:`, error)
			return false
		}
	}

	/**
	 * 移除事件記錄
	 */
	async remove(eventId: string): Promise<boolean> {
		try {
			const key = this.getKey(eventId)
			const deleted = await this.redis.del(key)
			return deleted > 0
		} catch (error) {
			// Redis 連線失敗
			console.warn(`Failed to remove event ${eventId}:`, error)
			return false
		}
	}

	/**
	 * 清空所有已處理事件記錄
	 */
	async clear(): Promise<void> {
		try {
			// 清空列表鍵
			await this.redis.del(this.allProcessedKey)

			// 注意：無法清空所有 dedup:event:* 鍵，因為 IRedisService 不支援 KEYS 模式匹配
			// 生產環境應使用 SCAN 迭代或定期清理策略
			console.warn('Partial clear: only cleared statistics list. Use TTL for automatic expiry.')
		} catch (error) {
			console.warn('Failed to clear event deduplicator:', error)
		}
	}

	/**
	 * 獲取已處理事件計數
	 */
	async getProcessedCount(): Promise<number> {
		try {
			// 返回所有已處理事件列表的長度
			return await this.redis.llen(this.allProcessedKey)
		} catch (error) {
			console.warn('Failed to get processed count:', error)
			return 0
		}
	}

	/**
	 * 列出所有已處理的事件 ID（若超過限制，返回前 1000 個）
	 */
	async listProcessedEventIds(limit = 1000): Promise<string[]> {
		try {
			const list = await this.redis.lrange(this.allProcessedKey, 0, limit - 1)
			return list
		} catch (error) {
			console.warn('Failed to list processed event IDs:', error)
			return []
		}
	}
}
