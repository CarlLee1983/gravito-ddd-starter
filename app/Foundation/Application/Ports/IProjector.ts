/**
 * @file IProjector.ts
 * @description CQRS 投影介面（Port）
 *
 * 支援事件投影、狀態重建與斷點續傳。
 * 在應用層定義，由基礎設施層提供具體實現（如 Memory、Redis）。
 *
 * **DDD 角色**
 * - 應用層：Application Port
 * - 職責：定義投影的合約（project、rebuild、getState、getCheckpoint）
 * - 使用場景：CQRS 讀側、統計聚合、實時儀表板
 *
 * **設計特點**
 * - 無狀態：投影者本身不保有狀態，狀態由 Repository 或 Store 維護
 * - 斷點續傳：通過 Checkpoint 支援從某事件位置恢復
 * - 可重建：支援從事件流全量重建投影狀態
 */

import type { StoredEvent } from '../../Infrastructure/Ports/Database/IEventStore'

/**
 * 投影檢查點 - 記錄投影進度
 */
export interface ProjectionCheckpoint {
	/** 投影器名稱 */
	projectorName: string

	/** 最後處理的事件 ID */
	lastProcessedEventId: string

	/** 最後處理的時間 */
	lastProcessedAt: Date

	/** 已處理的事件總數 */
	processedCount: number
}

/**
 * CQRS 投影介面
 *
 * @template TState - 投影狀態型別
 *
 * @example
 * ```typescript
 * // 實現一個產品評分投影
 * export class ProductRatingProjector extends BaseProjector<ProductRatingState> {
 *   readonly name = 'ProductRating'
 *
 *   protected initialState(): ProductRatingState {
 *     return {
 *       productId: '',
 *       totalReviews: 0,
 *       averageRating: 0,
 *       ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
 *     }
 *   }
 *
 *   protected applyEvent(state: ProductRatingState, event: StoredEvent): ProductRatingState {
 *     if (event.type === 'ReviewSubmitted') {
 *       const data = JSON.parse(event.data)
 *       // 更新評分分布與平均值...
 *       return { ...state, ... }
 *     }
 *     return state
 *   }
 * }
 * ```
 */
export interface IProjector<TState = unknown> {
	/**
	 * 投影器名稱（用於 Checkpoint 識別）
	 * @example 'ProductRating', 'DailyMetrics'
	 */
	readonly name: string

	/**
	 * 應用單個事件至投影狀態
	 *
	 * 此方法應是冪等的，允許重複呼叫同一事件。
	 * 將更新內部狀態並記錄 Checkpoint。
	 *
	 * @param event - 要應用的事件
	 * @returns 無傳回值（狀態通過 getState() 取得）
	 *
	 * @throws 實作者可拋出異常，調用者應正確處理
	 */
	project(event: StoredEvent): Promise<void>

	/**
	 * 從事件流全量重建投影狀態
	 *
	 * 此方法流程：
	 * 1. 清空當前狀態
	 * 2. 載入所有事件（通過 IEventStore.loadByEventType('*')）
	 * 3. 逐一呼叫 project(event)
	 * 4. 重置 Checkpoint 為最後一個事件
	 *
	 * 適用於：
	 * - 投影器初始化
	 * - 投影狀態損壞修復
	 * - 投影邏輯更新需要重算
	 *
	 * @returns 無傳回值（完成後狀態可通過 getState() 取得）
	 */
	rebuild(): Promise<void>

	/**
	 * 取得當前投影狀態
	 *
	 * @returns 投影狀態的完整副本（應為不可變物件）
	 */
	getState(): Promise<TState>

	/**
	 * 取得投影的斷點續傳檢查點
	 *
	 * 用於追蹤投影進度，支援分散式環境的投影恢復。
	 * - 若未開始投影，返回 null
	 * - 返回的 Checkpoint 應包含足夠資訊以恢復投影
	 *
	 * @returns ProjectionCheckpoint 或 null（未投影）
	 */
	getCheckpoint(): Promise<ProjectionCheckpoint | null>
}
