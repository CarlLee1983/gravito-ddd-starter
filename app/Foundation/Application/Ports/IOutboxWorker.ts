/**
 * @file IOutboxWorker.ts
 * @description Outbox Worker Port 介面
 *
 * Application Port（在 Application 層定義），用於 Outbox 項目的非同步處理。
 * 實現此介面的 Worker 應該：
 * - 定期掃描待處理的 Outbox 項目
 * - 分派相關的整合事件
 * - 標記已成功處理或失敗
 * - 支援重試機制與 Dead Letter Queue
 *
 * 設計原則：
 * - 非同步執行，不阻塞主流程
 * - 容錯設計：單個項目失敗不影響其他項目
 * - 可觀測：提供指標與監控能力
 */

/**
 * Outbox Worker 指標
 */
export interface OutboxWorkerMetrics {
	/** 處理的項目總數 */
	readonly processed: number

	/** 成功分派的項目數 */
	readonly successful: number

	/** 失敗的項目數 */
	readonly failed: number

	/** 移至 Dead Letter Queue 的項目數 */
	readonly movedToDeadLetterQueue: number

	/** 上次處理時間（ISO 8601） */
	readonly lastProcessedAt: Date

	/** 平均處理時間（毫秒） */
	readonly averageProcessingTimeMs: number

	/** 待處理隊列中的項目數 */
	readonly pendingCount: number

	/** 失敗隊列中的項目數 */
	readonly failedCount: number
}

/**
 * Outbox Worker Port
 *
 * 負責定期處理 Outbox 隊列中的待分派事件。
 * 實現應支援後台運行、錯誤恢復與指標收集。
 */
export interface IOutboxWorker {
	/**
	 * 啟動 Worker（開始定期掃描）
	 *
	 * 實現應在後台定期調用 processNextBatch()，
	 * 通常間隔為 1-5 秒。
	 *
	 * @returns Promise<void>
	 */
	start(): Promise<void>

	/**
	 * 停止 Worker（停止定期掃描）
	 *
	 * 應等待目前批次處理完畢後再關閉，
	 * 確保不會中斷進行中的分派操作。
	 *
	 * @returns Promise<void>
	 */
	stop(): Promise<void>

	/**
	 * 處理下一批 Outbox 項目
	 *
	 * **流程**:
	 * 1. 從 Repository 查詢待處理的項目
	 * 2. 對每個項目調用 EventDispatcher 分派事件
	 * 3. 若分派成功，標記為 processed
	 * 4. 若分派失敗，標記為 failed（並增加 retryCount）
	 * 5. 若 retryCount 超過上限，移至 Dead Letter Queue
	 *
	 * @param batchSize - 單批次最多處理的項目數（預設 50）
	 * @returns Promise 包含實際處理的項目數
	 * @throws 不應拋出異常，所有錯誤應被捕獲並記錄
	 */
	processNextBatch(batchSize?: number): Promise<number>

	/**
	 * 重試失敗的項目
	 *
	 * 嘗試重新分派失敗的項目。實現應在時間間隔後
	 * 再次嘗試（例如使用指數退避算法）。
	 *
	 * @param maxRetries - 最多重試次數（超過此值的項目不再重試）
	 * @param batchSize - 單批次最多重試的項目數（預設 20）
	 * @returns Promise 包含成功重試的項目數
	 */
	retryFailed(maxRetries?: number, batchSize?: number): Promise<number>

	/**
	 * 將超出最大重試次數的項目移至 Dead Letter Queue
	 *
	 * 這些項目不再自動重試，應由人工檢查並處理。
	 *
	 * @param maxRetries - 超過此重試次數的項目進入 DLQ（預設 3）
	 * @returns Promise 包含移至 DLQ 的項目數
	 */
	moveToDeadLetterQueue(maxRetries?: number): Promise<number>

	/**
	 * 獲取 Worker 運行指標
	 *
	 * 用於監控與調試。指標應包含處理計數、成功率、性能數據等。
	 *
	 * @returns Promise 包含 Outbox Worker 指標
	 */
	getMetrics(): Promise<OutboxWorkerMetrics>

	/**
	 * 重設指標計數器
	 *
	 * 用於定期統計（例如每小時重設）。
	 *
	 * @returns Promise<void>
	 */
	resetMetrics(): Promise<void>

	/**
	 * 檢查 Worker 是否正在運行
	 *
	 * @returns true 表示 Worker 正在運行
	 */
	isRunning(): boolean
}
