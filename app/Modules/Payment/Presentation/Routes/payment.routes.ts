import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { PaymentController } from '../Controllers/PaymentController'

export function registerPaymentRoutes(router: IModuleRouter, controller: PaymentController): void {
	// 取得支付記錄 (by ID)
	router.get('/api/payments/:id', (ctx) => controller.getPayment(ctx))

	// 取得訂單的支付記錄 (by OrderId)
	router.get('/api/payments/order/:orderId', (ctx) => controller.getPaymentByOrderId(ctx))

	// 列出所有支付記錄 (含分頁)
	router.get('/api/payments', (ctx) => controller.listPayments(ctx))
}
