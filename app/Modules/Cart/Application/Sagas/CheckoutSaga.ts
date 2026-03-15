/**
 * @file CheckoutSaga.ts
 * @description 結帳 Saga 協調器
 *
 * 在 DDD 架構中的角色：
 * - Application 層：使用案例協調
 * - 職責：編排購物車結帳、訂單建立、支付發起的完整流程
 *
 * 業務流程：
 * 1. CreateOrderStep：根據購物車建立訂單
 * 2. InitiatePaymentStep：為訂單發起支付
 * 補償：
 * - 支付失敗：CancelPaymentStep（取消已發起的支付）
 * - 都失敗：CancelOrderStep（取消已建立的訂單）
 *
 * @internal 示例實現
 */

import { SequentialSaga } from '@/Foundation/Infrastructure/Sagas/SequentialSaga'
import type { ISagaStep, SagaContext } from '@/Foundation/Infrastructure/Sagas/ISaga'

/**
 * 結帳 Saga 輸入
 */
export interface CheckoutSagaInput {
	userId: string
	cartId: string
	totalAmount: number
	currency?: string
	paymentMethod?: string
}

/**
 * 建立訂單步驟
 */
class CreateOrderStep implements ISagaStep {
	readonly name = 'CreateOrder'

	constructor(private orderService: any) {}

	async execute(input: CheckoutSagaInput, context: SagaContext): Promise<unknown> {
		console.log(`[CreateOrderStep] 為用戶 ${input.userId} 建立訂單`)

		// 調用應用層服務建立訂單
		const order = await this.orderService.createFromCart({
			userId: input.userId,
			cartId: input.cartId,
			totalAmount: input.totalAmount,
			correlationId: context.correlationId,
		})

		console.log(`[CreateOrderStep] 訂單已建立: ${order.id}`)
		return { orderId: order.id, order }
	}

	async compensate(context: SagaContext): Promise<void> {
		const result = context.results.get('CreateOrder') as any
		if (!result?.orderId) {
			console.log('[CreateOrderStep] 無需補償（未建立訂單）')
			return
		}

		console.log(`[CreateOrderStep] 補償：取消訂單 ${result.orderId}`)
		// 調用應用層服務取消訂單
		await this.orderService.cancel(result.orderId)
		console.log(`[CreateOrderStep] 訂單已取消: ${result.orderId}`)
	}
}

/**
 * 發起支付步驟
 */
class InitiatePaymentStep implements ISagaStep {
	readonly name = 'InitiatePayment'

	constructor(private paymentService: any) {}

	async execute(input: CheckoutSagaInput, context: SagaContext): Promise<unknown> {
		const createOrderResult = context.results.get('CreateOrder') as any
		const orderId = createOrderResult?.orderId

		if (!orderId) {
			throw new Error('訂單未建立，無法發起支付')
		}

		console.log(`[InitiatePaymentStep] 為訂單 ${orderId} 發起支付`)

		// 調用應用層服務發起支付
		const payment = await this.paymentService.initiate({
			orderId,
			userId: input.userId,
			amount: input.totalAmount,
			currency: input.currency ?? 'TWD',
			paymentMethod: input.paymentMethod ?? 'credit_card',
			correlationId: context.correlationId,
		})

		console.log(`[InitiatePaymentStep] 支付已發起: ${payment.id}`)
		return { paymentId: payment.id, payment }
	}

	async compensate(context: SagaContext): Promise<void> {
		const result = context.results.get('InitiatePayment') as any
		if (!result?.paymentId) {
			console.log('[InitiatePaymentStep] 無需補償（未發起支付）')
			return
		}

		console.log(`[InitiatePaymentStep] 補償：取消支付 ${result.paymentId}`)
		// 調用應用層服務取消支付
		await this.paymentService.cancel(result.paymentId)
		console.log(`[InitiatePaymentStep] 支付已取消: ${result.paymentId}`)
	}
}

/**
 * 結帳 Saga 工廠函數
 *
 * @param orderService - 訂單應用服務
 * @param paymentService - 支付應用服務
 * @returns 結帳 Saga 實例
 */
export function createCheckoutSaga(orderService: any, paymentService: any): SequentialSaga {
	const steps = [
		new CreateOrderStep(orderService),
		new InitiatePaymentStep(paymentService),
	]

	return new SequentialSaga(steps)
}
