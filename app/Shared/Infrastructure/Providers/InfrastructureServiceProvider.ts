/**
 * @file InfrastructureServiceProvider.ts
 * @description 基礎設施適配器服務提供者 - 對接 Gravito 框架模組
 *
 * Role: Infrastructure Adapter / Provider
 */

import { ModuleServiceProvider, type IContainer } from '../Ports/Core/IServiceProvider'
import { GravitoRedisAdapter } from '../Adapters/Gravito/GravitoRedisAdapter'
import { GravitoCacheAdapter } from '../Adapters/Gravito/GravitoCacheAdapter'
import { GravitoLoggerAdapter } from '../Adapters/Gravito/GravitoLoggerAdapter'
import { GravitoTranslatorAdapter } from '../Adapters/Gravito/GravitoTranslatorAdapter'
import { GravitoMailAdapter } from '../Adapters/Gravito/GravitoMailAdapter'
import { RedisJobQueueAdapter } from '../Adapters/Redis/RedisJobQueueAdapter'
import { StorageManager } from '../Storage/StorageManager'
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
		// 0. 註冊 Storage 管理器 (AdonisJS Drive Style)
		container.singleton('storage', (c) => {
			const config = (c as any).make('config').storage
			return new StorageManager(config)
		})

		// 1. 註冊 Redis 適配器
		// 注意：Gravito 框架已預先註冊了 'redis' 服務，我們包裝它為適配器版本
		container.singleton('redis-adapter', (c) => {
			const rawRedis = (c as any).make('redis') as RedisClientContract | undefined
			return rawRedis ? new GravitoRedisAdapter(rawRedis) : null
		})

		// 2. 註冊 Cache 適配器
		// 注意：Gravito 框架已預先註冊了 'cache' 服務，我們包裝它為適配器版本
		container.singleton('cache-adapter', (c) => {
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
			const redis = c.make('redis-adapter')
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
