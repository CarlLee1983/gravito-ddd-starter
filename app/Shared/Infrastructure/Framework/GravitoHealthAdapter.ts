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
import type { IInfrastructureProbe } from '@/Modules/Health/Domain/Services/IInfrastructureProbe'
import type { IDatabaseConnectivityCheck } from '../IDatabaseConnectivityCheck'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { createGravitoDatabaseConnectivityCheck } from '../Database/Adapters/Atlas'
import { PerformHealthCheckService } from '@/Modules/Health/Application/Services/PerformHealthCheckService'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'
import { MemoryHealthCheckRepository } from '@/Modules/Health/Infrastructure/Repositories/MemoryHealthCheckRepository'

/**
 * 基礎設施探測器適配器
 *
 * 實現 IInfrastructureProbe Port，負責探測系統各組件的健康狀態。
 * 將 Gravito 框架特定的 Adapter（Redis、Cache）和 Database 檢查統一封裝。
 */
class GravitoInfrastructureProbeAdapter implements IInfrastructureProbe {
	constructor(
		private databaseCheck: IDatabaseConnectivityCheck,
		private redis: any | null,
		private cache: any | null,
	) {}

	async probeDatabase(): Promise<boolean> {
		return this.databaseCheck.ping()
	}

	async probeRedis(): Promise<boolean> {
		if (!this.redis) return false

		try {
			const result = await this.redis.ping()
			return result === 'PONG' || result === true
		} catch {
			return false
		}
	}

	async probeCache(): Promise<boolean> {
		if (!this.cache) return false

		try {
			const result = await this.cache.ping()
			return result === 'PONG' || result === true
		} catch {
			return false
		}
	}
}

/**
 * 執行時探測器適配器
 *
 * 在請求時動態從容器解析服務，用於處理在啟動時尚未初始化的服務。
 */
class RuntimeInfrastructureProbeAdapter implements IInfrastructureProbe {
	constructor(
		private databaseCheck: IDatabaseConnectivityCheck,
		private container: any,
	) {}

	async probeDatabase(): Promise<boolean> {
		return this.databaseCheck.ping()
	}

	async probeRedis(): Promise<boolean> {
		try {
			const redisRaw = this.container.make('redis')
			if (!redisRaw) return false

			// Redis from Gravito (RedisClientContract) 有 ping() 方法
			const result = await (redisRaw as any).ping()
			return result === 'PONG' || result === 'OK' || result === true
		} catch {
			// Redis 服務未初始化或不可用
			return false
		}
	}

	async probeCache(): Promise<boolean> {
		try {
			const cacheRaw = this.container.make('cache')
			if (!cacheRaw) return false

			// Cache from Gravito (CacheManager) - 測試 set/get 操作
			const testKey = '__health_check__'
			await (cacheRaw as any).set(testKey, 'ok', 1)
			const value = await (cacheRaw as any).get(testKey)
			return value === 'ok'
		} catch {
			// Cache 服務未初始化或不可用
			return false
		}
	}
}

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
	// 注意：在此階段，redis/cache 服務可能尚未初始化
	// 我們在 RuntimeInfrastructureProbeAdapter 中動態解析服務，以確保在請求時已初始化

	// 組裝應用層（由 Gravito DB 適配器注入，Repository 與 ORM 解耦）
	const repository = new MemoryHealthCheckRepository()
	const databaseCheck = createGravitoDatabaseConnectivityCheck()

	const router = ctx.createModuleRouter()

	// 透過 IModuleRouter 註冊路由
	// 每個請求都建立新的 PerformHealthCheckService，以便使用 RuntimeInfrastructureProbeAdapter
	// 這樣可以在請求時動態解析已初始化的服務
	router.get('/health', (hctx) => {
		const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
		const performHealthCheckService = new PerformHealthCheckService(repository, probe)
		const controller = new HealthController(performHealthCheckService)
		return controller.check(hctx)
	})

	router.get('/health/history', (hctx) => {
		const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
		const performHealthCheckService = new PerformHealthCheckService(repository, probe)
		const controller = new HealthController(performHealthCheckService)
		return controller.history(hctx)
	})
}
