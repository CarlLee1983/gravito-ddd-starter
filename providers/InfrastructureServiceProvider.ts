/**
 * @file InfrastructureServiceProvider.ts
 * @description 基礎設施適配器服務提供者 - 對接 Gravito 框架模組
 *
 * Role: Infrastructure Adapter / Provider
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { GravitoLoggerAdapter } from '@/Shared/Infrastructure/Framework/GravitoLoggerAdapter'
import { GravitoTranslatorAdapter } from '@/Shared/Infrastructure/Framework/GravitoTranslatorAdapter'
import { GravitoMailAdapter } from '@/Shared/Infrastructure/Framework/GravitoMailAdapter'
import { RedisJobQueueAdapter } from '@/Shared/Infrastructure/Framework/RedisJobQueueAdapter'
import { RabbitMQJobQueueAdapter } from '@/Shared/Infrastructure/Framework/RabbitMQJobQueueAdapter'
import type { IRabbitMQService } from '@/Shared/Infrastructure/IRabbitMQService'

/**
 * 基礎設施服務提供者
 */
export class InfrastructureServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊適配器服務
	 */
	override register(container: IContainer): void {
		// 註意：storage 由 bootstrap 通過 OrbitNebula 自動註冊
		// 註意：databaseAccess 由 bootstrap 在 ModuleAutoWirer 之前注入
		// 無需在此處註冊資料庫或存儲管理器

		// 3. 註冊 Logger 適配器 (Sentinel)
		container.singleton('logger', () => {
			return new GravitoLoggerAdapter()
		})

		// 4. 註冊 Translator 適配器 (Prism)
		container.singleton('translator', () => {
			return new GravitoTranslatorAdapter()
		})

		// 5. 註冊 Mailer 適配器 (Signal)
		container.singleton('mailer', () => {
			return new GravitoMailAdapter()
		})

		// 6. 註冊 JobQueue 適配器
		container.singleton('jobQueue', (c) => {
			const driver = process.env.EVENT_DRIVER || 'memory'

			if (driver === 'rabbitmq') {
				try {
					const rabbitmq = c.make('rabbitmq') as IRabbitMQService
					console.log('[InfrastructureServiceProvider] 使用 RabbitMQJobQueueAdapter')
					return new RabbitMQJobQueueAdapter(rabbitmq)
				} catch (error) {
					console.warn('[InfrastructureServiceProvider] ⚠️ RabbitMQ 不可用，無法提供 JobQueue')
					throw error
				}
			}

			const redis = c.make('redis')
			return new RedisJobQueueAdapter(redis)
		})
	}

	/**
	 * 啟動後的檢查
	 */
	override boot(_context: any): void {
		console.log('🧱 [Infrastructure] Framework adapters integrated (Logging, i18n, Mail, Queue)')
	}
}
