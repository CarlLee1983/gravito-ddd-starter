/**
 * @file ICircuitBreaker.ts
 * @description 熔斷器介面（Port）
 *
 * 用於保護應用免受外部服務故障影響。
 * 實現三態狀態機（CLOSED → OPEN → HALF_OPEN → CLOSED）。
 *
 * **DDD 角色**
 * - 基礎設施層：Infrastructure Port (Services)
 * - 職責：故障隔離、自動恢復、故障檢測
 * - 使用場景：外部 API 呼叫、支付網關、第三方服務
 *
 * **設計特點**
 * - 三態狀態機：避免連鎖故障
 * - 自動恢復：OPEN 狀態達到 timeout 時自動轉 HALF_OPEN
 * - 計數機制：追蹤失敗和成功次數
 * - 冪等性：支援並發呼叫的安全狀態轉換
 *
 * **狀態轉換圖**
 * ```
 * CLOSED (服務正常)
 *   ↓ (失敗計數達到閾值 failureThreshold)
 * OPEN (服務熔斷，拒絕新請求)
 *   ↓ (timeout 毫秒後)
 * HALF_OPEN (試驗狀態，允許部分請求)
 *   ├─ (成功計數達到 successThreshold) → CLOSED
 *   └─ (任何失敗) → OPEN
 * ```
 */

/**
 * 熔斷器設定
 */
export interface CircuitBreakerConfig {
	/**
	 * 失敗次數閾值
	 *
	 * 當失敗計數達到此值時，狀態從 CLOSED 轉為 OPEN。
	 * 預設值：5
	 *
	 * @example
	 * failureThreshold: 5  // 5 次失敗後開路
	 */
	failureThreshold?: number

	/**
	 * 成功次數閾值
	 *
	 * 在 HALF_OPEN 狀態時，需要此數量的成功請求才能轉回 CLOSED。
	 * 預設值：2
	 *
	 * @example
	 * successThreshold: 2  // 2 次成功後關閉熔斷
	 */
	successThreshold?: number

	/**
	 * OPEN 狀態保持時間（毫秒）
	 *
	 * 達到此時間後，狀態從 OPEN 轉為 HALF_OPEN。
	 * 預設值：60000（60 秒）
	 *
	 * @example
	 * timeout: 60000  // 60 秒後進入試驗狀態
	 */
	timeout?: number
}

/**
 * 熔斷器狀態型別
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * 熔斷器開路異常
 *
 * 當熔斷器狀態為 OPEN 時拋出此異常。
 */
export class CircuitBreakerOpenException extends Error {
	constructor(message?: string) {
		super(message || 'Circuit breaker is open')
		this.name = 'CircuitBreakerOpenException'
	}
}

/**
 * 熔斷器介面
 *
 * @example
 * ```typescript
 * // 在 Adapter 中使用
 * export class ShipmentProviderAdapter implements IShipmentProviderPort {
 *   constructor(private circuitBreaker: ICircuitBreaker) {}
 *
 *   async dispatch(shipment: Shipment): Promise<TrackingNumber> {
 *     // execute() 自動管理狀態轉換
 *     return this.circuitBreaker.execute(async () => {
 *       const response = await this.externalAPI.createShipment(shipment)
 *       return TrackingNumber.create(response.trackingNumber)
 *     })
 *   }
 * }
 *
 * // 使用者側
 * try {
 *   await adapter.dispatch(shipment)
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenException) {
 *     // 熔斷器開路，服務暫時不可用
 *     return res.status(503).json({ error: 'Service temporarily unavailable' })
 *   }
 *   throw error
 * }
 * ```
 */
export interface ICircuitBreaker {
	/**
	 * 執行受保護的函式
	 *
	 * 根據當前狀態決策：
	 * - **CLOSED**：直接執行函式
	 *   - 成功：重置失敗計數
	 *   - 失敗：遞增失敗計數，若達閾值切換到 OPEN
	 *
	 * - **OPEN**：拋出 CircuitBreakerOpenException
	 *   - 若 timeout 已過期，轉為 HALF_OPEN，執行函式
	 *
	 * - **HALF_OPEN**：執行函式
	 *   - 成功：遞增成功計數，若達閾值切換回 CLOSED
	 *   - 失敗：立即切換到 OPEN
	 *
	 * @template T - 函式傳回型別
	 * @param fn - 要執行的非同步函式
	 * @returns 函式執行結果
	 *
	 * @throws CircuitBreakerOpenException 當熔斷器開路且非 timeout 時期
	 * @throws 原始函式的任何異常
	 *
	 * @example
	 * ```typescript
	 * const result = await circuitBreaker.execute(async () => {
	 *   return await externalService.fetchData()
	 * })
	 * ```
	 */
	execute<T>(fn: () => Promise<T>): Promise<T>

	/**
	 * 取得熔斷器當前狀態
	 *
	 * @returns 當前狀態：'CLOSED'、'OPEN' 或 'HALF_OPEN'
	 *
	 * @example
	 * ```typescript
	 * const state = circuitBreaker.getState()
	 * if (state === 'OPEN') {
	 *   logger.warn('Circuit breaker is open')
	 * }
	 * ```
	 */
	getState(): CircuitBreakerState

	/**
	 * 強制重置熔斷器為 CLOSED 狀態
	 *
	 * 適用於手動復原，應在人工確認服務恢復後呼叫。
	 * 重置後失敗計數與成功計數清零。
	 *
	 * @example
	 * ```typescript
	 * // 人工確認外部服務恢復後
	 * circuitBreaker.reset()
	 * logger.info('Circuit breaker reset manually')
	 * ```
	 */
	reset(): void
}
