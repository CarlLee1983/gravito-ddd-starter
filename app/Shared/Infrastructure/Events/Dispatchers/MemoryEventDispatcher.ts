/**
 * @file MemoryEventDispatcher.ts
 * @description 內存事件分發器實作 (Adapter)
 *
 * 支援分發 DomainEvent 和 IntegrationEvent
 * 同步分發，適合開發和測試環境
 *
 * 特點：
 * - 同步執行，所有 Handler 立即執行
 * - 若任一 Handler 失敗，其他 Handler 不會執行
 * - 支援重試機制（指數退避）
 * - 失敗事件記錄到死信隊列
 *
 * Role: Infrastructure Adapter
 */

import type { Event } from '../../Ports/Messaging/IEventDispatcher'
import type { ILogger } from '../../Ports/Services/ILogger'
import { BaseEventDispatcher } from './BaseEventDispatcher'

/**
 * 內存事件分發器
 *
 * 負責在同一個執行序中同步分發領域事件和整合事件。
 * 使用基類提供的失敗重試機制和死信隊列支持。
 */
export class MemoryEventDispatcher extends BaseEventDispatcher {
	private internalLogger: ILogger

	constructor(logger?: ILogger) {
		super()
		this.internalLogger = logger || {
			debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
			info: (msg: string) => console.info(`[INFO] ${msg}`),
			warn: (msg: string) => console.warn(`[WARN] ${msg}`),
			error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
		} as any
		this.setLogger(this.internalLogger)
	}

	/**
	 * 分發事件（同步）
	 *
	 * 立即執行所有訂閱者的處理函式
	 */
	async dispatch(events: Event | Event[]): Promise<void> {
		const eventList = Array.isArray(events) ? events : [events]

		for (const event of eventList) {
			const eventName = this.getEventName(event)
			const handlerCount = this.handlers.get(eventName)?.length || 0

			this.internalLogger.info(`分發事件: ${eventName} (${handlerCount} handlers)`)

			// 使用基類的 executeHandlers（包含失敗重試邏輯）
			try {
				await this.executeHandlers(eventName, event)
			} catch (error) {
				// 記錄到日誌，但不中斷其他事件的分發
				this.internalLogger.error(`分發事件 ${eventName} 失敗`, error)
				throw error // 重新拋出，讓調用者決定是否中斷
			}
		}
	}
}
