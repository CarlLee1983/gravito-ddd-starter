/**
 * @file SharedServiceProvider.ts
 * @description 共享層基礎設施服務提供者
 */

import { ModuleServiceProvider, type IContainer } from '../IServiceProvider'
import { MemoryEventDispatcher } from '../Framework/MemoryEventDispatcher'

/**
 * 共享服務提供者
 * 
 * 負責註冊全系統通用的基礎設施組件。
 */
export class SharedServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊全域單例服務
	 */
	override register(container: IContainer): void {
		// 註冊領域事件分發器
		container.singleton('eventDispatcher', () => {
			return new MemoryEventDispatcher()
		})
	}

	/**
	 * 啟動邏輯
	 */
	override boot(_context: any): void {
		console.log('📦 [Shared] Infrastructure services loaded')
	}
}
