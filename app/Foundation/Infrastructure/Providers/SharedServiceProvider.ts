/**
 * @file SharedServiceProvider.ts
 * @description 共享層基礎設施服務提供者
 *
 * 核心職責：
 * - 註冊全域基礎設施服務（EventDispatcher、JobQueue、Worker）
 * - 支援多種 driver（memory、redis、rabbitmq）
 * - 啟動時綁定中心化的事件監聽與 Job 處理程序（EventListenerRegistry、JobRegistry）
 */

import { ModuleServiceProvider, type IContainer } from '../Ports/Core/IServiceProvider'
import { MemoryEventDispatcher } from '../Events/Dispatchers/MemoryEventDispatcher'
import { RedisEventDispatcher } from '../Events/Dispatchers/RedisEventDispatcher'
import { SystemWorker } from '../../Application/SystemWorker'
import { GravitoLoggerAdapter } from '../Adapters/Gravito/GravitoLoggerAdapter'
import { EventListenerRegistry } from '../Registries/EventListenerRegistry'
import { JobRegistry } from '../Registries/JobRegistry'
import type { IRedisService } from '../Ports/Messaging/IRedisService'
import type { IQueueWorker } from '../../Application/Jobs/IQueueWorker'

/**
 * 共享服務提供者
 */
export class SharedServiceProvider extends ModuleServiceProvider {
	private logger = new GravitoLoggerAdapter()

	/**
	 * 註冊全域單例服務
	 */
	override register(container: IContainer): void {
		const driver = process.env.EVENT_DRIVER || 'memory'
		this.logger.info(`事件驅動模式: ${driver}`)

		// 註冊領域事件分發器
		container.singleton('eventDispatcher', (c) => {
			if (driver === 'redis') {
				try {
					const redis = c.make('redis') as IRedisService
					this.logger.info('使用 RedisEventDispatcher')
					return new RedisEventDispatcher(redis)
				} catch (error) {
					this.logger.warn('Redis 不可用，降級為 Memory 模式: ' + (error instanceof Error ? error.message : error))
					const logger = new GravitoLoggerAdapter()
					return new MemoryEventDispatcher(logger)
				}
			}
			// 直接使用 GravitoLoggerAdapter，避免依賴容器
			const logger = new GravitoLoggerAdapter()
			this.logger.info('使用 MemoryEventDispatcher')
			return new MemoryEventDispatcher(logger)
		})

		// 註冊統一 Worker (僅在 Redis 模式下有效)
		if (driver === 'redis') {
			container.singleton('systemWorker', (c) => {
				const redis = c.make('redis') as IRedisService
				const eventDispatcher = c.make('eventDispatcher')
				const jobQueue = c.make('jobQueue')
				return new SystemWorker(redis, eventDispatcher, jobQueue)
			})
		}
	}

	/**
	 * 啟動邏輯
	 *
	 * 在此階段執行：
	 * 1. 綁定所有已註冊的事件監聽器（EventListenerRegistry）
	 * 2. 綁定所有已註冊的 Job 處理程序（JobRegistry）
	 * 3. 啟動 Worker（若使用 redis）
	 */
	override boot(core: any): void {
		this.logger.info('[Shared] Infrastructure services loaded')

		// 1. 綁定所有已註冊的事件監聽器
		try {
			const eventDispatcher = core.container.make('eventDispatcher')
			EventListenerRegistry.bindAll(eventDispatcher, core.container)
		} catch (error) {
			this.logger.warn('[Shared] Could not bind event listeners: ' + (error instanceof Error ? error.message : error))
		}

		// 2. 綁定所有已註冊的 Job 處理程序
		try {
			const jobQueue = core.container.make('jobQueue')
			JobRegistry.bindAll(jobQueue, core.container)
		} catch (error) {
			this.logger.warn('[Shared] Could not bind job handlers: ' + (error instanceof Error ? error.message : error))
		}

		// 3. 啟動 Worker（若使用 redis）
		const driver = process.env.EVENT_DRIVER || 'memory'
		if (driver === 'redis') {
			try {
				const worker = core.container.make('systemWorker') as IQueueWorker
				worker.start()
				this.logger.info('[Shared] System Worker started in background')
			} catch (error) {
				this.logger.warn('[Shared] Could not start System Worker: ' + (error instanceof Error ? error.message : error))
			}
		}
	}
}
