/**
 * @file index.ts
 * @description Health 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'
import { wireHealthRoutes } from './Infrastructure/Wiring/wireHealthRoutes'

// Domain
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'
export { HealthCheck } from './Domain/Aggregates/HealthCheck'
export { SystemChecks } from './Domain/ValueObjects/SystemChecks'
export { HealthCheckService } from './Domain/Services/HealthCheckService'
export type { IInfrastructureProbe } from './Domain/Services/IInfrastructureProbe'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'

// Application
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'
export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'

// Infrastructure
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'

// Presentation
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/api'

/**
 * Health 模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 *
 * 注意：Health 模組無需 registerRepositories()，
 * 因為使用 MemoryHealthCheckRepository（無需 DI 容器）
 */
export const HealthModule: IModuleDefinition = {
	name: 'Health',
	provider: HealthServiceProvider,
	// 使用模組內部的 wiring 層（對齊 User/Post 模組架構）
	registerRoutes: wireHealthRoutes
}
