/**
 * @file registerInfrastructureAdapters.ts
 * @description 將 Gravito 框架底層服務對接到系統定義的 Port 介面
 */

import type { PlanetCore } from '@gravito/core'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'

/**
 * 註冊基礎設施適配器
 * 
 * 職責：從 Gravito 核心解析原始服務，並將其封裝為框架無關的介面註冊回容器。
 */
export function registerInfrastructureAdapters(core: PlanetCore): void {
	// 1. Redis 適配
	core.container.singleton('redis', (c) => {
		const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
		if (!rawRedis) {
			console.warn('⚠️ [Infrastructure] Gravito Redis 服務未配置')
			return null
		}
		return new GravitoRedisAdapter(rawRedis)
	})

	// 2. Cache 適配
	core.container.singleton('cache', (c) => {
		const rawCache = core.container.make<CacheManager | undefined>('cache')
		if (!rawCache) {
			console.warn('⚠️ [Infrastructure] Gravito Cache 服務未配置')
			return null
		}
		return new GravitoCacheAdapter(rawCache)
	})
}
