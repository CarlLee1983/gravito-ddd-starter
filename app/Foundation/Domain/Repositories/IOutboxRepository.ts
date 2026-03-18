/**
 * @file IOutboxRepository.ts
 * @description Outbox Repository Port 介面
 *
 * Domain Port（在 Domain 層定義），用於 Outbox 聚合根的持久化操作。
 * 實現此介面時，應支援樂觀鎖與批量操作以提高性能。
 *
 * 設計原則：
 * - 不依賴任何 ORM（ORM 無關）
 * - 支援事務性操作（Transaction）
 * - 支援批量查詢以優化 Worker 性能
 */

import type { OutboxEntry } from '../Aggregates/OutboxEntry'

/**
 * Outbox Repository Port
 *
 * 提供 Outbox 聚合根的持久化操作。
 * 所有實現都必須支援樂觀鎖以防止並發修改衝突。
 */
export interface IOutboxRepository {
	/**
	 * 保存 Outbox 項目（新增或更新）
	 *
	 * **樂觀鎖**：如果項目已存在且版本不匹配，應拋出 OptimisticLockException
	 *
	 * @param entry - Outbox 項目
	 * @throws OptimisticLockException - 版本衝突
	 * @returns Promise<void>
	 */
	save(entry: OutboxEntry): Promise<void>

	/**
	 * 根據 ID 查詢 Outbox 項目
	 *
	 * @param id - Outbox 項目 ID
	 * @returns Promise 包含項目或 null（若未找到）
	 */
	findById(id: string): Promise<OutboxEntry | null>

	/**
	 * 查詢所有待處理的 Outbox 項目（PENDING 狀態）
	 *
	 * 用於 OutboxWorker 批量處理。應按 createdAt 升序排序，
	 * 確保先進先出（FIFO）順序。
	 *
	 * @param limit - 最多返回的項目數（預設 100）
	 * @param offset - 偏移量（用於分頁，預設 0）
	 * @returns Promise 包含待處理項目陣列
	 */
	findUnprocessed(limit?: number, offset?: number): Promise<OutboxEntry[]>

	/**
	 * 查詢所有失敗的 Outbox 項目（FAILED 狀態）
	 *
	 * 用於重試機制。應按 retryCount 升序排序（優先重試最少的項目）。
	 *
	 * @param limit - 最多返回的項目數（預設 100）
	 * @returns Promise 包含失敗項目陣列
	 */
	findFailed(limit?: number): Promise<OutboxEntry[]>

	/**
	 * 查詢已超出最大重試次數的項目（應移至 Dead Letter Queue）
	 *
	 * @param maxRetries - 最大重試次數（預設 3）
	 * @returns Promise 包含超出重試次數的項目陣列
	 */
	findByDeadLetterQueue(maxRetries?: number): Promise<OutboxEntry[]>

	/**
	 * 計算待處理項目數量
	 *
	 * 用於監控 Outbox 隊列狀態。
	 *
	 * @returns Promise 包含待處理項目計數
	 */
	countUnprocessed(): Promise<number>

	/**
	 * 計算失敗項目數量
	 *
	 * 用於警告系統中是否有失敗項目堆積。
	 *
	 * @returns Promise 包含失敗項目計數
	 */
	countFailed(): Promise<number>

	/**
	 * 刪除已處理的項目（保留期限後清理）
	 *
	 * **注意**：此操作為物理刪除，應該根據業務需求決定是否執行。
	 * 建議至少保留 7 天以便故障排查。
	 *
	 * @param olderThan - 刪除在此日期之前且已處理的項目（預設 7 天前）
	 * @returns Promise 包含刪除的項目數
	 */
	deleteProcessed(olderThan?: Date): Promise<number>

	/**
	 * 刪除指定的 Outbox 項目
	 *
	 * @param id - Outbox 項目 ID
	 * @returns Promise<void>
	 */
	delete(id: string): Promise<void>

	/**
	 * 統計 Outbox 隊列的狀態信息
	 *
	 * 用於監控與指標收集。
	 *
	 * @returns Promise 包含統計信息
	 */
	getStats(): Promise<{
		pending: number
		processed: number
		failed: number
		totalRetries: number
		oldestPendingAt: Date | null
	}>
}
