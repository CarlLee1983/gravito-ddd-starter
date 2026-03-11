/**
 * @file index.ts
 * @description Health 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'

// Domain
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'
export { HealthCheck, type HealthCheckProps } from './Domain/Aggregates/HealthCheck'
export { HealthCheckService } from './Domain/Services/HealthCheckService'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'

// Application
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'
export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'

// Infrastructure
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'

// Presentation
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/health.routes'

/**
 * 裝配器專用的模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 */
export const HealthModule: IModuleDefinition = {
	name: 'Health',
	provider: HealthServiceProvider,
	// Health 模組使用整合適配器進行路由與服務組裝
	registerRoutes: registerHealthWithGravito
}
