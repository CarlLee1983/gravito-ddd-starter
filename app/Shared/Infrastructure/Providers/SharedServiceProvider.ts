/**
 * @file SharedServiceProvider.ts
 * @description 共享層基礎設施服務提供者
 */

import { ModuleServiceProvider, type IContainer } from '../IServiceProvider'
import { MemoryEventDispatcher } from '../Framework/MemoryEventDispatcher'
import { RedisEventDispatcher } from '../Framework/RedisEventDispatcher'
import { SystemWorker } from '../../Application/SystemWorker'
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

		// 註冊領域事件分發器
		container.singleton('eventDispatcher', (c) => {
			if (driver === 'redis') {
				const redis = c.make('redis') as IRedisService
				return new RedisEventDispatcher(redis)
			}
			return new MemoryEventDispatcher()
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
