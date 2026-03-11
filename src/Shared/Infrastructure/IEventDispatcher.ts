/**
 * @file IEventDispatcher.ts
 * @description 領域事件分發器介面 (Port)
 * 
 * Role: Infrastructure Port
 */

import type { DomainEvent } from '../Domain/DomainEvent'

/**
 * 定義事件處理函式型別
 */
export type EventHandler<T extends DomainEvent = any> = (event: T) => Promise<void> | void

/**
 * 事件分發器介面
 */
export interface IEventDispatcher {
	/**
	 * 分發單個或多個領域事件
	 * @param events - 要分發的事件
	 */
	dispatch(events: DomainEvent | DomainEvent[]): Promise<void>

	/**
	 * 訂閱特定類型的事件
	 * @param eventName - 事件名稱 (通常是事件類別的靜態名稱)
	 * @param handler - 處理函式
	 */
	subscribe(eventName: string, handler: EventHandler): void
}
