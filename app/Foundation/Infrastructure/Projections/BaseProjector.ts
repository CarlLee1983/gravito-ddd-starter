/**
 * @file BaseProjector.ts
 * @description CQRS 投影基類（抽象類）
 *
 * 提供投影的核心邏輯：事件應用、狀態管理、檢查點追蹤、全量重建。
 * 子類只需實現 applyEvent() 和 initialState() 即可。
 *
 * **DDD 角色**
 * - Infrastructure 層：基礎設施實現
 * - 職責：實現 IProjector 合約，管理投影狀態與 Checkpoint
 */

import type { IProjector, ProjectionCheckpoint } from '../../Application/Ports/IProjector'
import type { IEventStore, StoredEvent } from '../Ports/Database/IEventStore'
import type { ILogger } from '../Ports/Services/ILogger'
import type { IProjectionCheckpointStore } from '../../Application/Ports/IProjectionCheckpointStore'

/**
 * CQRS 投影抽象基類
 *
 * @template TState - 投影狀態型別
 *
 * @example
 * ```typescript
 * class OrderCountProjector extends BaseProjector<{ count: number }> {
 *   readonly name = 'OrderCount'
 *   protected initialState() { return { count: 0 } }
 *   protected applyEvent(state: { count: number }, event: StoredEvent) {
 *     if (event.eventType === 'OrderPlaced') {
 *       return { count: state.count + 1 }
 *     }
 *     return state
 *   }
 * }
 * ```
 */
export abstract class BaseProjector<TState> implements IProjector<TState> {
	abstract readonly name: string

	private state: TState

	constructor(
		protected readonly eventStore: IEventStore,
		protected readonly logger: ILogger,
		protected readonly checkpointStore: IProjectionCheckpointStore
	) {
		this.state = this.initialState()
	}

	/**
	 * 應用單個事件至投影狀態
	 *
	 * 流程：
	 * 1. 取得當前狀態
	 * 2. 呼叫 applyEvent() 產生新狀態（不可變）
	 * 3. 保存新狀態
	 * 4. 更新 Checkpoint
	 */
	async project(event: StoredEvent): Promise<void> {
		const currentState = this.state
		const newState = this.applyEvent(currentState, event)
		this.state = newState

		const existingCheckpoint = await this.checkpointStore.get(this.name)
		const processedCount = existingCheckpoint ? existingCheckpoint.processedCount + 1 : 1

		const checkpoint: ProjectionCheckpoint = {
			projectorName: this.name,
			lastProcessedEventId: event.id,
			lastProcessedAt: new Date(),
			processedCount,
		}

		await this.checkpointStore.save(checkpoint)

		this.logger.debug(`[Projector:${this.name}] Projected event ${event.eventType}`, {
			eventId: event.id,
			processedCount,
		})
	}

	/**
	 * 從事件流全量重建投影狀態
	 *
	 * 流程：
	 * 1. 重置狀態為 initialState()
	 * 2. 清空 Checkpoint
	 * 3. 載入所有事件
	 * 4. 逐一應用事件
	 */
	async rebuild(): Promise<void> {
		this.logger.info(`[Projector:${this.name}] Starting rebuild...`)

		// 重置狀態與 Checkpoint
		this.state = this.initialState()
		await this.checkpointStore.delete(this.name)

		// 載入所有事件
		const allEvents = await this.eventStore.loadByEventType('*')

		// 逐一應用事件
		for (const event of allEvents) {
			await this.project(event)
		}

		this.logger.info(`[Projector:${this.name}] Rebuild complete`, {
			eventsProcessed: allEvents.length,
		})
	}

	/**
	 * 取得當前投影狀態的副本（不可變）
	 */
	async getState(): Promise<TState> {
		return structuredClone(this.state)
	}

	/**
	 * 取得投影的 Checkpoint
	 */
	async getCheckpoint(): Promise<ProjectionCheckpoint | null> {
		return this.checkpointStore.get(this.name)
	}

	/**
	 * 子類實現：應用事件至狀態（必須返回新狀態，不可變）
	 */
	protected abstract applyEvent(state: TState, event: StoredEvent): TState

	/**
	 * 子類實現：返回初始狀態
	 */
	protected abstract initialState(): TState
}
