/**
 * @file BaseEventDispatcher.ts
 * @description 事件分發器基類 - 提取共用邏輯
 *
 * 所有事件分發器實現的基類，包含：
 * - 事件名稱提取
 * - 事件序列化
 * - 訂閱管理
 * - 統一的失敗重試邏輯
 */

import type { DomainEvent } from '../../../Domain/DomainEvent'
import type { IntegrationEvent } from '../../../Domain/IntegrationEvent'
import type { IEventDispatcher, Event, EventHandler } from '../../Ports/Messaging/IEventDispatcher'
import type { IDeadLetterQueue } from '../Policy/DeadLetterQueue'
import { calculateDelay, shouldRetry, DEFAULT_RETRY_POLICY, type RetryPolicy } from '../Policy/EventFailurePolicy'

/**
 * 事件分發器基類
 *
 * 提供統一的失敗處理機制、重試邏輯和死信隊列支持
 */
export abstract class BaseEventDispatcher implements IEventDispatcher {
	protected handlers: Map<string, EventHandler[]> = new Map()
	protected retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY
	protected deadLetterQueue?: IDeadLetterQueue

	/**
	 * 設置重試策略
	 * @param policy - 自定義重試策略
	 */
	setRetryPolicy(policy: RetryPolicy): void {
		this.retryPolicy = policy
	}

	/**
	 * 設置死信隊列
	 * @param dlq - 死信隊列實現
	 */
	setDeadLetterQueue(dlq: IDeadLetterQueue): void {
		this.deadLetterQueue = dlq
	}

	/**
	 * 訂閱事件（共用邏輯）
	 */
	subscribe(eventName: string, handler: EventHandler): void {
		if (!this.handlers.has(eventName)) {
			this.handlers.set(eventName, [])
		}
		this.handlers.get(eventName)!.push(handler)
	}

	/**
	 * 執行所有訂閱者處理函式（帶重試邏輯）
	 *
	 * @param eventName - 事件名稱
	 * @param eventData - 事件數據
	 */
	protected async executeHandlers(eventName: string, eventData: any): Promise<void> {
		const handlers = this.handlers.get(eventName) || []

		if (handlers.length === 0) {
			console.debug(`[BaseEventDispatcher] 無人訂閱事件: ${eventName}`)
			return
		}

		// 執行所有 Handler，記錄失敗
		const results = await Promise.allSettled(
			handlers.map((handler) => this.executeHandlerWithRetry(eventName, handler, eventData))
		)

		// 檢查是否有失敗的 Handler
		const failures = results.filter((r) => r.status === 'rejected')
		if (failures.length > 0) {
			console.error(`[BaseEventDispatcher] ${failures.length}/${handlers.length} 個 handler 執行失敗`)
		}
	}

	/**
	 * 執行單個 Handler（帶重試邏輯）
	 *
	 * @param eventName - 事件名稱
	 * @param handler - Handler 函式
	 * @param eventData - 事件數據
	 * @throws 在所有重試都失敗後拋出錯誤
	 */
	private async executeHandlerWithRetry(
		eventName: string,
		handler: EventHandler,
		eventData: any
	): Promise<void> {
		let lastError: Error | null = null
		let shouldRetryError = false
		const handlerName = handler.name || 'Anonymous'

		for (let attempt = 1; attempt <= this.retryPolicy.maxRetries; attempt++) {
			try {
				// 執行 Handler
				await handler(eventData)
				console.log(`[BaseEventDispatcher] ${eventName}/${handlerName} 執行成功 (嘗試 ${attempt})`)
				return // 成功，結束重試
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))
				console.warn(
					`[BaseEventDispatcher] ${eventName}/${handlerName} 執行失敗 (嘗試 ${attempt}/${this.retryPolicy.maxRetries}):`,
					lastError.message
				)

				// 判斷是否應該重試
				shouldRetryError = shouldRetry(error, attempt, this.retryPolicy.maxRetries)
				if (!shouldRetryError) {
					// 不可重試或已達最大重試次數，跳出循環處理
					break
				}

				// 計算延遲時間
				const delay = calculateDelay(attempt, this.retryPolicy)
				if (delay > 0) {
					await this.sleep(delay)
				}
			}
		}

		// 處理失敗情況（包括所有重試都失敗或不可重試的錯誤）
		if (lastError) {
			// 記錄到死信隊列
			if (this.deadLetterQueue) {
				await this.deadLetterQueue.add({
					eventName,
					eventData,
					error: lastError.message,
					attempts: this.retryPolicy.maxRetries,
					failedAt: new Date().toISOString(),
					retryable: true,
					reason: `${handlerName} 在所有重試都失敗`,
				})
			}

			throw new Error(
				`[${eventName}/${handlerName}] 在 ${this.retryPolicy.maxRetries} 次嘗試後仍然失敗: ${lastError.message}`
			)
		}
	}

	/**
	 * 提取事件名稱（共用邏輯）
	 *
	 * - IntegrationEvent: 使用 eventType（擁有 sourceContext 屬性）
	 * - DomainEvent: 使用 constructor.name
	 */
	protected getEventName(event: Event): string {
		// IntegrationEvent 獨有 sourceContext 屬性
		if ('sourceContext' in event && typeof event.sourceContext === 'string') {
			return (event as IntegrationEvent).eventType
		}
		// DomainEvent
		return (event as DomainEvent).constructor.name
	}

	/**
	 * 序列化事件（共用邏輯）
	 *
	 * - IntegrationEvent: 已是 plain object，直接序列化整體
	 * - DomainEvent: 呼叫 toJSON() 取得序列化資料
	 */
	protected serializeEvent(event: Event): Record<string, any> {
		// IntegrationEvent 獨有 sourceContext 屬性
		if ('sourceContext' in event && typeof event.sourceContext === 'string') {
			return event as Record<string, any>
		}
		// DomainEvent
		return (event as DomainEvent).toJSON()
	}

	/**
	 * 實現 dispatch 方法（由子類覆蓋）
	 */
	abstract dispatch(events: Event | Event[]): Promise<void>

	/**
	 * 睡眠輔助函式
	 */
	protected sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
