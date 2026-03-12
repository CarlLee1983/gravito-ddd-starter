/**
 * @file InfrastructureServiceProvider.ts
 * @description 基礎設施適配器服務提供者 - 對接 Gravito 框架模組
 *
 * Role: Infrastructure Adapter / Provider
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { GravitoRedisAdapter } from '@/Shared/Infrastructure/Framework/GravitoRedisAdapter'
import { GravitoCacheAdapter } from '@/Shared/Infrastructure/Framework/GravitoCacheAdapter'
import { GravitoLoggerAdapter } from '@/Shared/Infrastructure/Framework/GravitoLoggerAdapter'
import { GravitoTranslatorAdapter } from '@/Shared/Infrastructure/Framework/GravitoTranslatorAdapter'
import { GravitoMailAdapter } from '@/Shared/Infrastructure/Framework/GravitoMailAdapter'
import { RedisJobQueueAdapter } from '@/Shared/Infrastructure/Framework/RedisJobQueueAdapter'
import { StorageManager } from '@/Shared/Infrastructure/Storage/StorageManager'
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

		// 註意：Redis 和 Cache 由 Gravito PlanetCore 通過 config 自動註冊
		// 無需在此處二次包裝以避免循環依賴
		// 在運行時（request handler）中直接從 Gravito 容器取得

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
