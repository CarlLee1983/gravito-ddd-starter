/**
 * @file wireHealthRoutes.ts
 * @description Health 模組路由接線，負責初始化控制器並註冊路由
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { IInfrastructureProbe } from '../../Domain/Services/IInfrastructureProbe'
import type { IDatabaseConnectivityCheck } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseConnectivityCheck'
import { createGravitoDatabaseConnectivityCheck } from '@/Foundation/Infrastructure/Database/Adapters/Atlas'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import { HealthController } from '../../Presentation/Controllers/HealthController'
import { HealthMessageService } from '../Services/HealthMessageService'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 執行時探測器適配器
 *
 * 在請求時動態從容器解析服務，用於處理在啟動時尚未初始化的服務。
 */
class RuntimeInfrastructureProbeAdapter implements IInfrastructureProbe {
	/**
	 * @param databaseCheck - 資料庫連接檢查介面
	 * @param container - 依賴注入容器
	 */
	constructor(
		private databaseCheck: IDatabaseConnectivityCheck,
		private container: any
	) {}

	/**
	 * 探測資料庫狀態
	 *
	 * @returns 是否連接成功
	 */
	async probeDatabase(): Promise<boolean> {
		return this.databaseCheck.ping()
	}

	/**
	 * 探測 Redis 狀態
	 *
	 * @returns 是否連接成功
	 */
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

	/**
	 * 探測快取服務狀態
	 *
	 * @returns 是否可用
	 */
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

	// 手動建立訊息服務（不依賴 DI 容器）
	let translator: ITranslator
	try {
		translator = ctx.container.make('translator') as ITranslator
	} catch {
		// 降級：使用假 translator
		translator = {
			trans: (key: string) => key,
			transChoice: (key: string) => key,
			setLocale: () => {},
		} as any
	}
	const healthMessages = new HealthMessageService(translator)

	// 註冊 /health 路由
	router.get('/health', (hctx) => {
		const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
		const performHealthCheckService = new PerformHealthCheckService(repository, probe)
		const controller = new HealthController(performHealthCheckService, healthMessages)
		return controller.check(hctx)
	})

	// 註冊 /health/history 路由
	router.get('/health/history', (hctx) => {
		const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
		const performHealthCheckService = new PerformHealthCheckService(repository, probe)
		const controller = new HealthController(performHealthCheckService, healthMessages)
		return controller.history(hctx)
	})
}
