/**
 * @file wireHealthRoutes.ts
 * @description Health 模組路由接線（對齊架構模式）
 *
 * 責任：從容器取得 Infrastructure 探測器 → 組裝 Service + Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴特定框架。
 *
 * 架構優勢：
 * - Health 模組自包含，不依賴 Shared 層的特定實現
 * - 移除 Shared 層對 Health 模組的反向依賴
 * - 與 User/Post 模組的 wiring 模式一致
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import type { IInfrastructureProbe } from '../../Domain/Services/IInfrastructureProbe'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/Ports/Database/IDatabaseConnectivityCheck'
import { createGravitoDatabaseConnectivityCheck } from '@/Shared/Infrastructure/Database/Adapters/Atlas'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import { HealthController } from '../../Presentation/Controllers/HealthController'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'

/**
 * 執行時探測器適配器
 *
 * 在請求時動態從容器解析服務，用於處理在啟動時尚未初始化的服務。
 * 實現 IInfrastructureProbe Port。
 */
class RuntimeInfrastructureProbeAdapter implements IInfrastructureProbe {
	constructor(
		private databaseCheck: IDatabaseConnectivityCheck,
		private container: any
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
 * 註冊 Health 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireHealthRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	// 組裝基礎設施層
	const repository = new MemoryHealthCheckRepository()
	const databaseCheck = createGravitoDatabaseConnectivityCheck()

	// 註冊 /health 路由
	// 每個請求都建立新的 PerformHealthCheckService，以便使用 RuntimeInfrastructureProbeAdapter
	// 這樣可以在請求時動態解析已初始化的服務
	router.get('/health', (hctx) => {
		const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
		const performHealthCheckService = new PerformHealthCheckService(repository, probe)
		const controller = new HealthController(performHealthCheckService)
		return controller.check(hctx)
	})

	// 註冊 /health/history 路由
	router.get('/health/history', (hctx) => {
		const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
		const performHealthCheckService = new PerformHealthCheckService(repository, probe)
		const controller = new HealthController(performHealthCheckService)
		return controller.history(hctx)
	})
}
