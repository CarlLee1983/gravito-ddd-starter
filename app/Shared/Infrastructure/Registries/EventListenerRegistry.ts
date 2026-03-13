/**
 * @file EventListenerRegistry.ts
 * @description 中心化事件監聽登錄表
 *
 * 集中管理跨模組的事件訂閱，提供清晰、可追蹤的事件處理流程。
 *
 * 設計目標：
 * - 替代分散在各 Module ServiceProvider.boot() 中的 dispatcher.subscribe() 呼叫
 * - 提供一個統一的視窗，查看所有已註冊的事件監聽器
 * - 簡化 Module 的啟動邏輯，降低相互依賴
 *
 * 使用流程：
 * 1. 在 Module 的 ServiceProvider.register() 中呼叫 EventListenerRegistry.register()
 * 2. 在 SharedServiceProvider.boot() 中呼叫 EventListenerRegistry.bindAll()
 *
 * @example
 * ```typescript
 * // 在 User Module ServiceProvider 中
 * override register(container: IContainer): void {
 *   container.singleton('sendWelcomeEmailHandler', (c) => new SendWelcomeEmail(...))
 *   container.singleton('logUserCreationHandler', (c) => new LogUserCreation(...))
 *
 *   EventListenerRegistry.register({
 *     moduleName: 'User',
 *     listeners: [
 *       { eventName: 'UserCreated', handlerFactory: (c) => c.make('sendWelcomeEmailHandler') },
 *       { eventName: 'UserCreated', handlerFactory: (c) => c.make('logUserCreationHandler') }
 *     ]
 *   })
 * }
 *
 * // 在 SharedServiceProvider.boot() 中
 * override boot(core: any): void {
 *   EventListenerRegistry.bindAll(core.container.make('eventDispatcher'), core.container)
 * }
 * ```
 */

import type { IEventDispatcher, EventHandler } from '../Ports/Messaging/IEventDispatcher'
import type { IContainer } from '../Ports/Core/IServiceProvider'

/**
 * 事件監聽器定義
 */
export interface IEventListener {
	/** 監聽的事件名稱 */
	eventName: string
	/** 處理程序工廠函數（從容器解析） */
	handlerFactory: (container: IContainer) => EventHandler
}

/**
 * Module 事件監聽器集合
 */
export interface IModuleListeners {
	/** Module 名稱（用於日誌與調試） */
	moduleName: string
	/** 此 Module 的事件監聽器列表 */
	listeners: IEventListener[]
}

/**
 * 中心化事件監聽登錄表
 *
 * 用於集中管理應用中所有的事件訂閱，提供透明、可追蹤的事件流。
 */
export class EventListenerRegistry {
	/**
	 * 註冊的事件監聽器集合
	 * 鍵：Module 名稱
	 * 值：Module 的事件監聽器列表
	 */
	private static readonly listeners = new Map<string, IModuleListeners>()

	/**
	 * 由 Module 呼叫，向 Registry 註冊其事件監聽器
	 *
	 * 此方法應在 Module ServiceProvider.register() 中呼叫
	 *
	 * @param moduleListeners - Module 的事件監聽器定義
	 *
	 * @example
	 * ```typescript
	 * EventListenerRegistry.register({
	 *   moduleName: 'User',
	 *   listeners: [
	 *     { eventName: 'UserCreated', handlerFactory: (c) => c.make('sendWelcomeEmailHandler') }
	 *   ]
	 * })
	 * ```
	 */
	static register(moduleListeners: IModuleListeners): void {
		const existing = this.listeners.get(moduleListeners.moduleName)
		if (existing) {
			// 合併新增的監聽器（同一 Module 可能在不同層註冊）
			existing.listeners.push(...moduleListeners.listeners)
		} else {
			this.listeners.set(moduleListeners.moduleName, moduleListeners)
		}

		if (process.env.NODE_ENV === 'development') {
			console.log(
				`[EventListenerRegistry] Registered ${moduleListeners.listeners.length} listeners for module: ${moduleListeners.moduleName}`
			)
		}
	}

	/**
	 * 將所有已註冊的事件監聽器綁定到 EventDispatcher
	 *
	 * 此方法應在 SharedServiceProvider.boot() 中呼叫，在所有 Module 的 register() 完成後
	 *
	 * @param dispatcher - IEventDispatcher 實例
	 * @param container - IContainer 實例（用於解析 Handler）
	 *
	 * @example
	 * ```typescript
	 * override boot(core: any): void {
	 *   const dispatcher = core.container.make('eventDispatcher')
	 *   EventListenerRegistry.bindAll(dispatcher, core.container)
	 * }
	 * ```
	 */
	static bindAll(dispatcher: IEventDispatcher, container: IContainer): void {
		let totalBound = 0

		for (const [moduleName, moduleListeners] of this.listeners.entries()) {
			for (const listener of moduleListeners.listeners) {
				try {
					const handler = listener.handlerFactory(container)
					dispatcher.subscribe(listener.eventName, handler)
					totalBound++

					if (process.env.NODE_ENV === 'development') {
						console.log(
							`  ✓ [${moduleName}] Bound listener for event: ${listener.eventName}`
						)
					}
				} catch (error) {
					console.warn(
						`⚠️  [${moduleName}] Failed to bind listener for event: ${listener.eventName}`,
						error instanceof Error ? error.message : error
					)
				}
			}
		}

		console.log(
			`🔗 [EventListenerRegistry] Successfully bound ${totalBound} event listeners`
		)
	}

	/**
	 * 清空所有已註冊的監聽器
	 *
	 * 僅用於測試環境，測試前清空狀態
	 */
	static clear(): void {
		this.listeners.clear()
	}

	/**
	 * 取得所有已註冊的監聽器（用於調試、測試）
	 *
	 * @returns 所有已註冊的 Module 監聽器
	 */
	static getAll(): IModuleListeners[] {
		return Array.from(this.listeners.values())
	}

	/**
	 * 取得特定 Module 的已註冊監聽器（用於調試、測試）
	 *
	 * @param moduleName - Module 名稱
	 * @returns Module 的監聽器列表，若未註冊則回傳 undefined
	 */
	static getByModule(moduleName: string): IModuleListeners | undefined {
		return this.listeners.get(moduleName)
	}
}
