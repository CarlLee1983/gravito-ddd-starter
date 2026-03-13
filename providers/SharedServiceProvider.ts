/**
 * @file SharedServiceProvider.ts
 * @description 共享層基礎設施服務提供者
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/Ports/Core/IServiceProvider'
import { MemoryEventDispatcher } from '@/Shared/Infrastructure/Events/Dispatchers/MemoryEventDispatcher'
import { RedisEventDispatcher } from '@/Shared/Infrastructure/Events/Dispatchers/RedisEventDispatcher'
import { RabbitMQAdapter } from '@/Shared/Infrastructure/Adapters/RabbitMQ/RabbitMQAdapter'
import { RabbitMQEventDispatcher } from '@/Shared/Infrastructure/Events/Dispatchers/RabbitMQEventDispatcher'
import { SystemWorker } from '@/Shared/Application/SystemWorker'
import type { IRedisService } from '@/Shared/Infrastructure/Ports/Messaging/IRedisService'
import type { IRabbitMQService } from '@/Shared/Infrastructure/Ports/Messaging/IRabbitMQService'
import type { RedisJobQueueAdapter } from '@/Shared/Infrastructure/Adapters/Redis/RedisJobQueueAdapter'
import type { RabbitMQJobQueueAdapter } from '@/Shared/Infrastructure/Adapters/RabbitMQ/RabbitMQJobQueueAdapter'

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
			if (driver === 'rabbitmq') {
				try {
					const rabbitmq = c.make('rabbitmq') as IRabbitMQService
					console.log('[SharedServiceProvider] 使用 RabbitMQEventDispatcher')
					return new RabbitMQEventDispatcher(rabbitmq)
				} catch (error) {
					console.warn('[SharedServiceProvider] ⚠️ RabbitMQ 不可用，降級為 Memory 模式:', error instanceof Error ? error.message : error)
					console.log('[SharedServiceProvider] 使用 MemoryEventDispatcher (降級)')
					return new MemoryEventDispatcher()
				}
			}

			if (driver === 'redis') {
				try {
					const redis = c.make('redis') as IRedisService
					console.log('[SharedServiceProvider] 使用 RedisEventDispatcher')
					return new RedisEventDispatcher(redis)
				} catch (error) {
					console.warn('[SharedServiceProvider] ⚠️ Redis 不可用，降級為 Memory 模式:', error instanceof Error ? error.message : error)
					console.log('[SharedServiceProvider] 使用 MemoryEventDispatcher (降級)')
					return new MemoryEventDispatcher()
				}
			}
			console.log('[SharedServiceProvider] 使用 MemoryEventDispatcher')
			return new MemoryEventDispatcher()
		})

		// 註冊 RabbitMQ 服務（如果使用 rabbitmq 驅動）
		if (driver === 'rabbitmq') {
			container.singleton('rabbitmq', () => {
				const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
				console.log('[SharedServiceProvider] 正在連線到 RabbitMQ:', url)
				return new RabbitMQAdapter(url)
			})
		}

		// 註冊統一 Worker (Redis 模式下有效)
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

		if (driver === 'rabbitmq') {
			try {
				const rabbitmq = core.container.make('rabbitmq') as IRabbitMQService
				const eventDispatcher = core.container.make('eventDispatcher') as RabbitMQEventDispatcher

				// 非同步連線和啟動消費者
				;(async () => {
					try {
						await rabbitmq.connect()
						console.log('✅ [Shared] Connected to RabbitMQ')

						await eventDispatcher.startConsuming()
						console.log('🔗 [Shared] RabbitMQ Event Dispatcher consumers started')

						// 嘗試啟動 JobQueue Consumer（如果存在）
						try {
							const jobQueue = core.container.make('jobQueue') as RabbitMQJobQueueAdapter
							await jobQueue.startConsuming()
							console.log('🔗 [Shared] RabbitMQ Job Queue consumers started')
						} catch (error) {
							console.warn('⚠️ [Shared] Could not start RabbitMQ Job Queue consumers')
						}
					} catch (error) {
						console.error('❌ [Shared] Failed to start RabbitMQ consumers:', error)
					}
				})()
			} catch (error) {
				console.warn('⚠️ [Shared] Could not initialize RabbitMQ')
			}
		}

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
