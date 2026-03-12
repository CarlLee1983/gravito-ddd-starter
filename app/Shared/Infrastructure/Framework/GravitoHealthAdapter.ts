/**
 * @file GravitoHealthAdapter.ts
 * @description Health 模組完整框架適配器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責將 Health 模組掛載到 Gravito 框架。
 * - 職責：作為核心系統與 Gravito 特定服務（如 Redis, Cache）的對接點，組裝健康檢查相關的服務與控制器。
 */

import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import type { IRouteRegistrationContext } from './ModuleDefinition'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { createGravitoDatabaseConnectivityCheck } from '../Database/Adapters/Atlas'
import { PerformHealthCheckService } from '@/Modules/Health/Application/Services/PerformHealthCheckService'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'
import { MemoryHealthCheckRepository } from '@/Modules/Health/Infrastructure/Repositories/MemoryHealthCheckRepository'

/**
 * 註冊 Health 模組與 Gravito 框架的整合
 *
 * 責任：
 * 1. 從 Context 取得 Redis/Cache（可能為 undefined）
 * 2. 適配為框架無關的 IRedisService/ICacheService
 * 3. 組裝 PerformHealthCheckService + HealthController
 * 4. 透過 IModuleRouter 註冊路由
 *
 * 適配器僅依賴 IRouteRegistrationContext，不直接依賴 PlanetCore。
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 *
 * @example
 * registerHealthWithGravito(ctx)
 */
export function registerHealthWithGravito(ctx: IRouteRegistrationContext): void {
	// 從 Context 取得原始服務（可能為 undefined）
	let rawRedis: RedisClientContract | undefined
	let rawCache: CacheManager | undefined

	try {
		rawRedis = ctx.container.make('redis') as RedisClientContract | undefined
	} catch {
		rawRedis = undefined
	}

	try {
		rawCache = ctx.container.make('cache') as CacheManager | undefined
	} catch {
		rawCache = undefined
	}

	// 適配為框架無關的介面（null 表示未設定）
	const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
	const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null

	// 組裝應用層（由 Gravito DB 適配器注入，Repository 與 ORM 解耦）
	const repository = new MemoryHealthCheckRepository()
	const databaseCheck = createGravitoDatabaseConnectivityCheck()
	const performHealthCheckService = new PerformHealthCheckService(repository)
	const controller = new HealthController(performHealthCheckService)

	const router = ctx.createModuleRouter()

	// 透過 IModuleRouter 註冊路由
	router.get('/health', (ctx) => {
		// 為了相容目前的 API，將適配器服務注入到 context
		ctx.set('__redis', redis)
		ctx.set('__cache', cache)
		ctx.set('__databaseCheck', databaseCheck)
		return controller.check(ctx)
	})

	router.get('/health/history', (ctx) => controller.history(ctx))
}
