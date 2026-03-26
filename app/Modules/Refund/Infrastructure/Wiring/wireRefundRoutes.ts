/**
 * @file wireRefundRoutes.ts
 * @description Refund 模組路由裝配
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴特定框架。
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import type { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import type { IRefundQueryService } from '../../Application/Queries/IRefundQueryService'
import type { IRefundMessages } from '../../Presentation/Ports/IRefundMessages'
import { RefundController } from '../../Presentation/Controllers/RefundController'
import { registerRefundRoutes } from '../../Presentation/Routes/api'

/**
 * 註冊 Refund 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireRefundRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	let refundApplicationService: RefundApplicationService
	let refundQueryService: IRefundQueryService
	let refundMessages: IRefundMessages

	try {
		refundApplicationService = ctx.container.make('refundApplicationService') as RefundApplicationService
		refundQueryService = ctx.container.make('refundQueryService') as IRefundQueryService
		refundMessages = ctx.container.make('refundMessages') as IRefundMessages
	} catch (error) {
		console.warn('[wireRefundRoutes] Warning: Application services not ready, skipping route registration')
		return
	}

	const controller = new RefundController(
		refundApplicationService,
		refundQueryService,
		refundMessages
	)

	registerRefundRoutes(router, controller)
}
