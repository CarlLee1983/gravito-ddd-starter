/**
 * @file index.ts
 * @description Refund 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { RefundServiceProvider } from './Infrastructure/Providers/RefundServiceProvider'
import { registerRefundRepositories } from './Infrastructure/Providers/registerRefundRepositories'
import { wireRefundRoutes } from './Infrastructure/Wiring/wireRefundRoutes'

// Domain - Entities
export { Refund } from './Domain/Entities/Refund'
export { ReturnItem } from './Domain/Entities/ReturnItem'

// Domain - ValueObjects
export { Money } from './Domain/ValueObjects/Money'
export { RefundId } from './Domain/ValueObjects/RefundId'
export { RefundType } from './Domain/ValueObjects/RefundType'
export { RefundStatus } from './Domain/ValueObjects/RefundStatus'
export { RefundReason } from './Domain/ValueObjects/RefundReason'
export { ItemCondition } from './Domain/ValueObjects/ItemCondition'
export { RefundCalculation } from './Domain/ValueObjects/RefundCalculation'
export { RefundFees } from './Domain/ValueObjects/RefundFees'
export { RefundPolicyConfig } from './Domain/ValueObjects/RefundPolicyConfig'
export { PolicyDecision } from './Domain/ValueObjects/PolicyDecision'
export { OrderContext } from './Domain/ValueObjects/OrderContext'
export type { OrderLineSnapshot } from './Domain/ValueObjects/OrderContext'

// Domain - Events
export { RefundRequested } from './Domain/Events/RefundRequested'
export { RefundAutoApproved } from './Domain/Events/RefundAutoApproved'
export { RefundManualReviewRequired } from './Domain/Events/RefundManualReviewRequired'
export { RefundApproved } from './Domain/Events/RefundApproved'
export { RefundRejected } from './Domain/Events/RefundRejected'
export { ReturnItemsShipped } from './Domain/Events/ReturnItemsShipped'
export { ReturnItemsReceived } from './Domain/Events/ReturnItemsReceived'
export { RefundProcessing } from './Domain/Events/RefundProcessing'
export { RefundCompleted } from './Domain/Events/RefundCompleted'
export { RefundFailed } from './Domain/Events/RefundFailed'

// Domain - Repositories
export type { IRefundRepository } from './Domain/Repositories/IRefundRepository'

// Domain - Ports
export type { IOrderQueryPort } from './Domain/Ports/IOrderQueryPort'
export type { IRefundHistoryPort } from './Domain/Ports/IRefundHistoryPort'

// Domain - Services
export { RefundPolicy } from './Domain/Services/RefundPolicy'
export { RefundCalculator } from './Domain/Services/RefundCalculator'

// Application - DTOs
export type { RefundDTO, ReturnItemDTO, RefundCalculationDTO } from './Application/DTOs/RefundDTO'
export { toRefundDTO } from './Application/DTOs/RefundDTO'
export type { CreateRefundDTO } from './Application/DTOs/CreateRefundDTO'
export type { ItemConditionDTO } from './Application/DTOs/ItemConditionDTO'

// Application - Queries
export type { IRefundQueryService } from './Application/Queries/IRefundQueryService'

// Application - Services
export { RefundApplicationService } from './Application/Services/RefundApplicationService'

// Presentation - Ports
export type { IRefundMessages } from './Presentation/Ports/IRefundMessages'

// Presentation
export { RefundController } from './Presentation/Controllers/RefundController'
export { registerRefundRoutes } from './Presentation/Routes/api'

// Infrastructure
export { RefundRepository } from './Infrastructure/Repositories/RefundRepository'
export { RefundServiceProvider } from './Infrastructure/Providers/RefundServiceProvider'
export { OrderQueryAdapter } from './Infrastructure/Adapters/OrderQueryAdapter'
export { RefundHistoryAdapter } from './Infrastructure/Adapters/RefundHistoryAdapter'
export { RefundQueryService } from './Infrastructure/Services/RefundQueryService'
export { RefundMessageService } from './Infrastructure/Services/RefundMessageService'
export { PaymentRefundHandler } from './Infrastructure/EventHandlers/PaymentRefundHandler'

/**
 * 裝配器專用的模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 */
export const RefundModule: IModuleDefinition = {
	name: 'Refund',
	provider: RefundServiceProvider,
	registerRepositories: registerRefundRepositories,
	registerRoutes: wireRefundRoutes,
}
