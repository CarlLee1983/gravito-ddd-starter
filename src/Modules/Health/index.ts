/**
 * @file index.ts
 * @description 健康檢查模組的公開入口點
 * @module src/Modules/Health
 */

// Domain Layer
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'
export { HealthCheck, type HealthCheckProps } from './Domain/Aggregates/HealthCheck'
export { HealthCheckService } from './Domain/Services/HealthCheckService'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'

// Application Layer
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'
export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'

// Infrastructure Layer
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'

// Presentation Layer
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/health.routes'
