/**
 * @file ISaga.ts
 * @description Saga 模式的核心介面定義
 *
 * 在 DDD 架構中的角色：
 * - Infrastructure Port：定義跨聚合根的長時間執行流程（Long-Running Process）
 * - 職責：協調多個聚合根之間的事件驅動工作流，實現補償機制的失敗回滾
 *
 * Saga 模式解決的問題：
 * - 分散事務：無法使用傳統資料庫事務跨越多個服務/聚合根
 * - 補償：失敗時如何撤銷已完成的步驟
 * - 可觀測性：追蹤跨模組的業務流程執行狀況
 *
 * @public - Saga 介面是應用層的公開 API
 */

/**
 * Saga 執行上下文
 *
 * 在 Saga 流程中攜帶狀態和結果的容器。
 * @public
 */
export interface SagaContext {
	/**
	 * 關聯 ID：用於追蹤整個 Saga 執行過程中的所有事件
	 * 若未指定，系統自動生成 UUID
	 */
	readonly correlationId: string

	/**
	 * 步驟執行結果存儲
	 * Key: 步驟名稱, Value: 該步驟返回的結果
	 * 後續步驟可通過此 Map 存取前置步驟的結果
	 */
	readonly results: Map<string, unknown>

	/**
	 * Saga 執行過程中發生的異常（如有）
	 * 若為 null，表示 Saga 執行成功
	 */
	error?: Error
}

/**
 * Saga 步驟介面
 *
 * 每個步驟定義：
 * - 正向邏輯（execute）：執行業務操作
 * - 反向邏輯（compensate）：在失敗時進行補償（撤銷操作）
 *
 * @template TInput - 步驟輸入資料型別
 * @template TOutput - 步驟輸出資料型別
 * @public
 */
export interface ISagaStep<TInput = unknown, TOutput = unknown> {
	/**
	 * 步驟名稱（唯一識別符）
	 * 用於結果存儲、日誌紀錄、補償時追蹤
	 */
	readonly name: string

	/**
	 * 執行業務邏輯
	 *
	 * @param input - 步驟輸入
	 * @param context - Saga 上下文（可存取先前步驟結果）
	 * @returns 步驟輸出（將存儲在 context.results[stepName]）
	 * @throws 若拋出異常，Saga 將觸發補償流程
	 */
	execute(input: TInput, context: SagaContext): Promise<TOutput>

	/**
	 * 補償邏輯（失敗時回滾）
	 *
	 * @param context - Saga 上下文（包含所有已執行步驟的結果）
	 * @throws 補償失敗拋出異常，將被記錄但不中斷後續補償步驟
	 *
	 * @remarks
	 * - 補償應該是冪等的（執行多次結果相同）
	 * - 補償應該盡量簡單，不拋出異常
	 * - 若補償失敗，應記錄警告而非回滾（防止無限迴圈）
	 */
	compensate(context: SagaContext): Promise<void>
}

/**
 * Saga 協調器介面
 *
 * 負責編排並執行一系列相互關聯的 Saga 步驟。
 * @public
 */
export interface ISagaOrchestrator {
	/**
	 * 執行 Saga
	 *
	 * 流程：
	 * 1. 逐步串行執行所有步驟
	 * 2. 每個步驟的結果存儲在 context.results
	 * 3. 若任一步驟失敗，立即觸發補償流程
	 * 4. 補償按倒序執行所有已完成步驟
	 * 5. 返回 context（含最終狀態和錯誤）
	 *
	 * @param input - Saga 輸入資料
	 * @param correlationId - 關聯 ID（可選，不指定則自動生成 UUID）
	 * @returns Saga 執行結果（上下文）
	 *
	 * @example
	 * ```typescript
	 * const saga = new CheckoutSaga(orderService, paymentService)
	 * const context = await saga.execute({
	 *   userId: 'user-123',
	 *   cartId: 'cart-456',
	 *   totalAmount: 99.99,
	 * })
	 *
	 * if (context.error) {
	 *   console.log(`Saga 失敗: ${context.error.message}`)
	 * } else {
	 *   console.log(`訂單已建立: ${context.results.get('CreateOrder')}`)
	 * }
	 * ```
	 */
	execute(input: unknown, correlationId?: string): Promise<SagaContext>
}
