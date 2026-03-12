/**
 * @file IQueueWorker.ts
 * @description 隊列 Worker 抽象介面
 *
 * 定義 Worker 進程的標準行為，支援不同的隊列實現（Redis、RabbitMQ 等）。
 *
 * 設計目標：
 * - 框架無關：不依賴特定的 ORM、隊列實現
 * - 簡潔清晰：提供最小必要的方法
 * - 優雅關閉：支援 SIGTERM/SIGINT 信號的正常終止
 *
 * Role: Application Port
 */

/**
 * 隊列 Worker 抽象介面
 *
 * Worker 負責從隊列消費 Job，執行相應的處理邏輯。
 *
 * @example
 * ```typescript
 * // 在 worker.ts 中
 * const worker = core.container.make('systemWorker') as IQueueWorker
 *
 * // 啟動 Worker 進程
 * await worker.start()
 *
 * // 設置優雅關閉
 * process.on('SIGTERM', async () => {
 *   console.log('Shutting down worker...')
 *   await worker.waitForIdle()
 *   worker.stop()
 *   process.exit(0)
 * })
 * ```
 */
export interface IQueueWorker {
	/**
	 * 啟動 Worker 進程
	 *
	 * 開始消費隊列中的 Job，並執行相應的處理邏輯。
	 * 此方法為非阻塞的，Worker 會在背景執行。
	 *
	 * @throws 若隊列連接失敗，應拋出具體錯誤
	 *
	 * @example
	 * ```typescript
	 * await worker.start()
	 * console.log('Worker started')
	 * ```
	 */
	start(): Promise<void>

	/**
	 * 停止 Worker 進程
	 *
	 * 停止消費隊列中的新 Job。
	 * 如需等待當前正在執行的 Job 完成，使用 waitForIdle()。
	 *
	 * @example
	 * ```typescript
	 * worker.stop()
	 * console.log('Worker stopped accepting new jobs')
	 * ```
	 */
	stop(): void

	/**
	 * 等待 Worker 進入空閒狀態
	 *
	 * 阻塞等待直到所有當前正在執行的 Job 完成。
	 * 通常用於優雅關閉時，確保 Job 執行完畢後再退出進程。
	 *
	 * @returns Promise，當所有當前 Job 完成時 resolve
	 * @param timeout - 等待超時時間（毫秒），可選。若超時仍未完成，將拋出異常。
	 *
	 * @throws 若等待超時，應拋出 TimeoutError
	 *
	 * @example
	 * ```typescript
	 * process.on('SIGTERM', async () => {
	 *   worker.stop()
	 *   try {
	 *     await worker.waitForIdle(30000)  // 等待 30 秒
	 *     console.log('All jobs completed')
	 *   } catch (error) {
	 *     console.error('Worker did not complete in time')
	 *   }
	 *   process.exit(0)
	 * })
	 * ```
	 */
	waitForIdle(timeout?: number): Promise<void>
}
