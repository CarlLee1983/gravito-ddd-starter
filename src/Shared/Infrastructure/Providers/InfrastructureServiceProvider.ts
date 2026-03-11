/**
 * @file InfrastructureServiceProvider.ts
 * @description 基礎設施適配器服務提供者 - 對接 Gravito 框架模組
 *
 * Role: Infrastructure Adapter / Provider
 */

import { ModuleServiceProvider, type IContainer } from '../IServiceProvider'
import { GravitoRedisAdapter } from '../Framework/GravitoRedisAdapter'
import { GravitoCacheAdapter } from '../Framework/GravitoCacheAdapter'
import { GravitoLoggerAdapter } from '../Framework/GravitoLoggerAdapter'
import { GravitoTranslatorAdapter } from '../Framework/GravitoTranslatorAdapter'
import { GravitoMailAdapter } from '../Framework/GravitoMailAdapter'
import { RedisJobQueueAdapter } from '../Framework/RedisJobQueueAdapter'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'

/**
 * 基礎設施服務提供者
 */
export class InfrastructureServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊適配器服務
	 */
	override register(container: IContainer): void {
		// 1. 註冊 Redis 適配器
		container.singleton('redis', (c) => {
			const rawRedis = (c as any).make('redis') as RedisClientContract | undefined
			return rawRedis ? new GravitoRedisAdapter(rawRedis) : null
		})

		// 2. 註冊 Cache 適配器
		container.singleton('cache', (c) => {
			const rawCache = (c as any).make('cache') as CacheManager | undefined
			return rawCache ? new GravitoCacheAdapter(rawCache) : null
		})

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
