/**
 * @file MemoryOutboxRepository.ts
 * @description 記憶體實現的 Outbox Repository
 *
 * 用於開發與測試環境。所有 Outbox 項目存儲在記憶體 Map 中。
 * 支援樂觀鎖與批量操作。
 */

import type { IOutboxRepository } from '../../Domain/Repositories/IOutboxRepository'
import { OutboxEntry } from '../../Domain/Aggregates/OutboxEntry'
import { OptimisticLockException } from '../../Application/OptimisticLockException'

/**
 * 內存 Outbox Repository 實現
 *
 * 特點：
 * - 原子操作：Map 操作在 JS 中天然是原子的
 * - 樂觀鎖：記錄版本號，檢查衝突
 * - 內存存儲：進程重啟後數據丟失（符合測試預期）
 */
export class MemoryOutboxRepository implements IOutboxRepository {
	// 主存儲區：id → OutboxEntry
	private readonly entries: Map<string, OutboxEntry> = new Map()

	// 索引：eventId → id（用於防重檢查）
	private readonly eventIdIndex: Set<string> = new Set()

	/**
	 * 保存 Outbox 項目（新增或更新）
	 *
	 * 樂觀鎖檢查：若項目存在且版本不匹配，拋出異常
	 */
	async save(entry: OutboxEntry): Promise<void> {
		const existing = this.entries.get(entry.id)

		if (existing) {
			// 更新現有項目：檢查樂觀鎖
			if (existing.version !== entry.version - 1) {
				throw new OptimisticLockException('OutboxEntry', entry.id, existing.version)
			}
		}

		// 保存項目
		this.entries.set(entry.id, entry)

		// 更新事件 ID 索引（用於防重）
		if (entry.isProcessed()) {
			this.eventIdIndex.add(entry.eventId)
		}
	}

	/**
	 * 根據 ID 查詢 Outbox 項目
	 */
	async findById(id: string): Promise<OutboxEntry | null> {
		return this.entries.get(id) ?? null
	}

	/**
	 * 查詢所有待處理的項目（PENDING 狀態）
	 *
	 * 按 createdAt 升序排序（FIFO）
	 *
	 * 去重邏輯：排除已經被成功分派過的 eventId（基於 eventIdIndex）
	 * 確保相同 eventId 的事件只被分派一次，防止重複處理
	 */
	async findUnprocessed(limit: number = 100, offset: number = 0): Promise<OutboxEntry[]> {
		const pending = Array.from(this.entries.values())
			.filter((entry) => {
				// 只返回 PENDING 狀態的項目
				if (!entry.isPending()) {
					return false
				}
				// 去重：排除已經被成功處理的 eventId
				if (this.eventIdIndex.has(entry.eventId)) {
					return false
				}
				return true
			})
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

		return pending.slice(offset, offset + limit)
	}

	/**
	 * 查詢所有失敗的項目（FAILED 狀態）
	 *
	 * 按 retryCount 升序排序（優先重試最少次數的）
	 */
	async findFailed(limit: number = 100): Promise<OutboxEntry[]> {
		const failed = Array.from(this.entries.values())
			.filter((entry) => entry.isFailed())
			.sort((a, b) => a.retryCount - b.retryCount)

		return failed.slice(0, limit)
	}

	/**
	 * 查詢已超出最大重試次數的項目（應移至 Dead Letter Queue）
	 */
	async findByDeadLetterQueue(maxRetries: number = 3): Promise<OutboxEntry[]> {
		return Array.from(this.entries.values()).filter((entry) =>
			entry.shouldMoveToDeadLetterQueue(maxRetries)
		)
	}

	/**
	 * 計算待處理項目數量
	 */
	async countUnprocessed(): Promise<number> {
		return Array.from(this.entries.values()).filter((entry) => entry.isPending()).length
	}

	/**
	 * 計算失敗項目數量
	 */
	async countFailed(): Promise<number> {
		return Array.from(this.entries.values()).filter((entry) => entry.isFailed()).length
	}

	/**
	 * 刪除已處理的項目（保留期限後清理）
	 *
	 * @param olderThan - 刪除在此日期之前且已處理的項目（預設 7 天前）
	 * @returns 刪除的項目數
	 */
	async deleteProcessed(olderThan?: Date): Promise<number> {
		const cutoffDate = olderThan ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 天前

		let deleted = 0
		for (const [id, entry] of this.entries.entries()) {
			if (entry.isProcessed() && entry.createdAt < cutoffDate) {
				this.entries.delete(id)
				this.eventIdIndex.delete(entry.eventId)
				deleted++
			}
		}

		return deleted
	}

	/**
	 * 刪除指定的 Outbox 項目
	 */
	async delete(id: string): Promise<void> {
		const entry = this.entries.get(id)
		if (entry) {
			this.entries.delete(id)
			this.eventIdIndex.delete(entry.eventId)
		}
	}

	/**
	 * 統計 Outbox 隊列的狀態信息
	 */
	async getStats(): Promise<{
		pending: number
		processed: number
		failed: number
		totalRetries: number
		oldestPendingAt: Date | null
	}> {
		const entries = Array.from(this.entries.values())

		const pending = entries.filter((e) => e.isPending())
		const processed = entries.filter((e) => e.isProcessed())
		const failed = entries.filter((e) => e.isFailed())
		const totalRetries = failed.reduce((sum, e) => sum + e.retryCount, 0)
		const oldestPendingAt = pending.length > 0 ? pending[0]!.createdAt : null

		return {
			pending: pending.length,
			processed: processed.length,
			failed: failed.length,
			totalRetries,
			oldestPendingAt,
		}
	}

	// ============================================
	// 輔助方法（用於防重檢查）
	// ============================================

	/**
	 * 取得已處理的事件 ID 集合（用於防重）
	 *
	 * @returns 已成功分派的事件 ID 集合
	 */
	async getProcessedEventIds(): Promise<Set<string>> {
		return new Set(this.eventIdIndex)
	}

	/**
	 * 檢查事件 ID 是否已處理（防重檢查）
	 */
	async isEventProcessed(eventId: string): Promise<boolean> {
		return this.eventIdIndex.has(eventId)
	}

	// ============================================
	// 測試輔助方法
	// ============================================

	/**
	 * 清空所有數據（測試用）
	 */
	async clear(): Promise<void> {
		this.entries.clear()
		this.eventIdIndex.clear()
	}

	/**
	 * 取得所有項目（測試用）
	 */
	async getAllEntries(): Promise<OutboxEntry[]> {
		return Array.from(this.entries.values())
	}
}
