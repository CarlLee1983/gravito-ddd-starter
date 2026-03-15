/**
 * @file HealthServiceProvider.ts
 * @description 配置健康檢查模組的服務依賴註冊中心
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import { HealthMessageService } from '../Services/HealthMessageService'
import { IInfrastructureProbe } from '../../Domain/Services/IInfrastructureProbe'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * HealthServiceProvider 類別
 * 
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」。
 * 負責將健康檢查模組內部的倉儲與應用服務註冊到 DI 容器中。
 */
export class HealthServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊健康檢查模組的服務與單例到容器
	 * 
	 * @param container - 框架無關的容器介面 (IContainer)
	 */
	override register(container: IContainer): void {
		// 1. 註冊 Repository (單例)
		container.singleton('healthRepository', () => {
			return new MemoryHealthCheckRepository()
		})

		// 1.5. 註冊訊息服務（使用工廠方法延遲解析 translator）
		container.singleton('healthMessages', (c) => {
			try {
				return new HealthMessageService(c.make('translator') as ITranslator)
			} catch {
				// 如果 translator 還未註冊（啟動期間），使用虛擬實現
				const fallback: any = {
					trans: (key: string) => key,
					choice: (key: string) => key,
					setLocale: () => {},
					getLocale: () => 'en',
				}
				return new HealthMessageService(fallback)
			}
		})

		// 2. 註冊 Application Service（每次解析時建立新實例）
		container.bind('healthCheckService', (c: IContainer) => {
			const repository = c.make('healthRepository') as IHealthCheckRepository
			return new PerformHealthCheckService(repository, c.make('infrastructureProbe') as IInfrastructureProbe)
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 * 
	 * @param _context - 啟動上下文對象
	 */
	override boot(_context: any): void {
		console.log('💚 [Health] Module loaded')
	}
}
