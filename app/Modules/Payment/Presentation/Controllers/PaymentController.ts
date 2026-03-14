import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'
import { PaymentId } from '../../Domain/ValueObjects/PaymentId'

export class PaymentController {
	constructor(private repository: IPaymentRepository) {}

	async getPayment(ctx: IHttpContext): Promise<Response> {
		try {
			const id = ctx.params.id
			if (!id) {
				return ctx.json({ success: false, message: '缺少支付ID' }, 400)
			}

			const payment = await this.repository.findById(PaymentId.from(id))
			if (!payment) {
				return ctx.json({ success: false, message: '支付記錄不存在' }, 404)
			}

			return ctx.json({
				success: true,
				data: {
					id: payment.id.value,
					orderId: payment.orderId,
					userId: payment.userId,
					amountCents: payment.amount.cents,
					amountTWD: payment.amount.dollars,
					paymentMethod: payment.paymentMethod.type,
					status: payment.status.value,
					transactionId: payment.transactionId?.value,
					failureReason: payment.failureReason,
					createdAt: payment.createdAt.toISOString(),
					updatedAt: payment.updatedAt.toISOString(),
				}
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : '未知錯誤'
			return ctx.json({ success: false, message }, 500)
		}
	}

	async getPaymentByOrderId(ctx: IHttpContext): Promise<Response> {
		try {
			const orderId = ctx.params.orderId
			if (!orderId) {
				return ctx.json({ success: false, message: '缺少訂單ID' }, 400)
			}

			const payment = await this.repository.findByOrderId(orderId)
			if (!payment) {
				return ctx.json({ success: false, message: '支付記錄不存在' }, 404)
			}

			return ctx.json({
				success: true,
				data: {
					id: payment.id.value,
					orderId: payment.orderId,
					userId: payment.userId,
					amountCents: payment.amount.cents,
					amountTWD: payment.amount.dollars,
					paymentMethod: payment.paymentMethod.type,
					status: payment.status.value,
					transactionId: payment.transactionId?.value,
					failureReason: payment.failureReason,
					createdAt: payment.createdAt.toISOString(),
					updatedAt: payment.updatedAt.toISOString(),
				}
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : '未知錯誤'
			return ctx.json({ success: false, message }, 500)
		}
	}

	async listPayments(ctx: IHttpContext): Promise<Response> {
		try {
			const limit = ctx.query?.limit ? parseInt(ctx.query.limit as string) : 10
			const offset = ctx.query?.offset ? parseInt(ctx.query.offset as string) : 0

			const payments = await this.repository.findAll({ limit, offset })

			return ctx.json({
				success: true,
				data: payments.map(p => ({
					id: p.id.value,
					orderId: p.orderId,
					userId: p.userId,
					amountCents: p.amount.cents,
					amountTWD: p.amount.dollars,
					paymentMethod: p.paymentMethod.type,
					status: p.status.value,
					transactionId: p.transactionId?.value,
					createdAt: p.createdAt.toISOString(),
				})),
				meta: { limit, offset }
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : '未知錯誤'
			return ctx.json({ success: false, message }, 500)
		}
	}
}
