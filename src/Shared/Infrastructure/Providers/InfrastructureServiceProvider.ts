/**
 * @file InfrastructureServiceProvider.ts
 * @description 基礎設施適配器服務提供者 - 對接 Gravito 框架模組
 * 
 * Role: Infrastructure Adapter / Provider
 */

import { ModuleServiceProvider, type IContainer } from '../IServiceProvider'
import { GravitoRedisAdapter } from '../Framework/GravitoRedisAdapter'
import { GravitoCacheAdapter } from '../Framework/GravitoCacheAdapter'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'

/**
 * 基礎設施服務提供者
 * 
 * 職責：將 Gravito 框架提供的原始服務 (如 Plasma Redis) 
 * 適配為系統定義的 Port 介面並註冊到容器中。
 */
export class InfrastructureServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊適配器服務
	 */
	override register(container: IContainer): void {
		// 1. 註冊 Redis 適配器
		container.singleton('redis', (c) => {
			// 從 Gravito 原始容器獲取 Plasma 實例 (通常在 core.register 階段已就緒)
			const rawRedis = (c as any).make('redis') as RedisClientContract | undefined
			if (!rawRedis) {
				console.warn('⚠️ [Infrastructure] Gravito Redis 模組未配置或未載入')
				return null
			}
			return new GravitoRedisAdapter(rawRedis)
		})

		// 2. 註冊 Cache 適配器
		container.singleton('cache', (c) => {
			const rawCache = (c as any).make('cache') as CacheManager | undefined
			if (!rawCache) {
				console.warn('⚠️ [Infrastructure] Gravito Cache 模組未配置或未載入')
				return null
			}
			return new GravitoCacheAdapter(rawCache)
		})
	}

	/**
	 * 啟動後的檢查
	 */
	override boot(_context: any): void {
		console.log('🧱 [Infrastructure] Framework adapters integrated')
	}
}
