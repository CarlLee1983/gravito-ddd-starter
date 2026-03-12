/**
 * @file SharedServiceProvider.ts
 * @description 共享層基礎設施服務提供者
 */

import { ModuleServiceProvider, type IContainer } from '../IServiceProvider'
import { MemoryEventDispatcher } from '../Framework/MemoryEventDispatcher'
import { RedisEventDispatcher } from '../Framework/RedisEventDispatcher'
import { SystemWorker } from '../../Application/SystemWorker'
import { GravitoLoggerAdapter } from '../Framework/GravitoLoggerAdapter'
import type { IRedisService } from '../IRedisService'
import type { RedisJobQueueAdapter } from '../Framework/RedisJobQueueAdapter'

/**
 * 共享服務提供者
 */
export class SharedServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊全域單例服務
	 */
	override register(container: IContainer): void {
		const driver = process.env.EVENT_DRIVER || 'memory'
		console.log(`[SharedServiceProvider] 事件驅動模式: ${driver}`)

		// 註冊領域事件分發器
		container.singleton('eventDispatcher', (c) => {
			if (driver === 'redis') {
				try {
					const redis = c.make('redis') as IRedisService
					console.log('[SharedServiceProvider] 使用 RedisEventDispatcher')
					return new RedisEventDispatcher(redis)
				} catch (error) {
					console.warn('[SharedServiceProvider] ⚠️ Redis 不可用，降級為 Memory 模式:', error instanceof Error ? error.message : error)
					const logger = new GravitoLoggerAdapter()
					return new MemoryEventDispatcher(logger)
				}
			}
			// 直接使用 GravitoLoggerAdapter，避免依賴容器
			const logger = new GravitoLoggerAdapter()
			console.log('[SharedServiceProvider] 使用 MemoryEventDispatcher')
			return new MemoryEventDispatcher(logger)
		})

		// 註冊統一 Worker (僅在 Redis 模式下有效)
		if (driver === 'redis') {
			container.singleton('systemWorker', (c) => {
				const redis = c.make('redis') as IRedisService
				const eventDispatcher = c.make('eventDispatcher') as RedisEventDispatcher
				const jobQueue = c.make('jobQueue') as RedisJobQueueAdapter
				return new SystemWorker(redis, eventDispatcher, jobQueue)
			})
		}
	}

	/**
	 * 啟動邏輯
	 */
	override boot(core: any): void {
		console.log('📦 [Shared] Infrastructure services loaded')

		const driver = process.env.EVENT_DRIVER || 'memory'
		if (driver === 'redis') {
			try {
				const worker = core.container.make('systemWorker') as SystemWorker
				worker.start()
				console.log('🔗 [Shared] System Worker started in background')
			} catch (error) {
				console.warn('⚠️ [Shared] Could not start System Worker')
			}
		}
	}
}
