/**
 * @file IEventDispatcher.ts
 * @description 領域事件分發器介面 (Port)
 *
 * 支援分發两種事件型別：
 * - DomainEvent: 同一 Bounded Context 內的事件
 * - IntegrationEvent: 跨 Bounded Context 的事件
 *
 * Role: Infrastructure Port
 */

import type { DomainEvent } from '../../../Domain/DomainEvent'
import type { IntegrationEvent } from '../../../Domain/IntegrationEvent'

/**
 * 事件型別聯合體
 */
export type Event = DomainEvent | IntegrationEvent

/**
 * 定義事件處理函式型別
 */
export type EventHandler<T extends Event = any> = (event: T) => Promise<void> | void

/**
 * 事件分發器介面
 */
export interface IEventDispatcher {
	/**
	 * 分發單個或多個事件（DomainEvent 或 IntegrationEvent）
	 * @param events - 要分發的事件陣列或單一事件
	 */
	dispatch(events: Event | Event[]): Promise<void>

	/**
	 * 訂閱特定類型的事件
	 * @param eventName - 事件名稱或型別
	 * @param handler - 處理函式
	 */
	subscribe(eventName: string, handler: EventHandler): void
}
