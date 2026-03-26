/**
 * @file index.ts
 * @description AuditLog 模組導出點
 *
 * 本模組為 Append-Only 審計日誌系統，訂閱 5 個事件並記錄審計條目。
 * 提供 HTTP 端點查詢審計日誌。
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { AuditLogServiceProvider } from './Infrastructure/Providers/AuditLogServiceProvider'
import { registerAuditLogRepositories } from './Infrastructure/Providers/registerAuditLogRepositories'
import { registerAuditLogRoutes } from './Presentation/Routes/api'

/**
 * AuditLog 模組定義
 */
export const auditLogModule: IModuleDefinition = {
	name: 'AuditLog',
	provider: AuditLogServiceProvider,

	registerRepositories: (_db, _eventDispatcher, _repositoryRegistry, container) => {
		if (container) {
			registerAuditLogRepositories(container)
		}
	},

	registerRoutes: (ctx) => {
		const router = ctx.createModuleRouter()
		const controller = ctx.container.make('auditLogController')
		registerAuditLogRoutes(router, controller as any)
	},
}

// Domain 導出
export { AuditEntry, SYSTEM_USER_ID } from './Domain/Aggregates/AuditEntry'
export { AuditAction } from './Domain/ValueObjects/AuditAction'
export { AuditSeverity } from './Domain/ValueObjects/AuditSeverity'
export type { IAuditEntryRepository } from './Domain/Repositories/IAuditEntryRepository'

// Handler 導出（測試用途）
export { OrderPlacedAuditHandler } from './Application/Handlers/OrderPlacedAuditHandler'
export { PaymentSucceededAuditHandler } from './Application/Handlers/PaymentSucceededAuditHandler'
export { PaymentFailedAuditHandler } from './Application/Handlers/PaymentFailedAuditHandler'
export { OrderCancelledAuditHandler } from './Application/Handlers/OrderCancelledAuditHandler'
export { InventoryDeductedAuditHandler } from './Application/Handlers/InventoryDeductedAuditHandler'

// Infrastructure 導出
export { MemoryAuditEntryRepository } from './Infrastructure/Repositories/MemoryAuditEntryRepository'
export { AuditLogMessageService } from './Infrastructure/Services/AuditLogMessageService'
export type { IAuditLogMessages } from './Presentation/Ports/IAuditLogMessages'
export { AuditLogController } from './Presentation/Controllers/AuditLogController'

// Events re-export
export {
	OrderPlaced,
	OrderCancelled,
	PaymentSucceeded,
	PaymentFailed,
	InventoryDeducted,
} from './Domain/Events/AuditLogEvents'
