/**
 * @file SendPaymentFailedEmailHandler.ts
 * @description 支付失敗事件 Handler，dispatch 失敗通知信 Job 到隊列
 *
 * 訂閱 PaymentFailed 事件，提取必要資料並推送 SendPaymentFailedEmailJob 到隊列。
 * Role: Application Layer - Event handler
 */

import { SendPaymentFailedEmailJob, type SendPaymentFailedEmailData } from '../Jobs/SendPaymentFailedEmailJob'
import { PaymentFailed } from '../../Domain/Events/PaymentFailed'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 支付失敗通知信 Handler
 *
 * 訂閱 PaymentFailed 事件，當支付失敗時發送通知信
 */
export class SendPaymentFailedEmailHandler {
	constructor(
		private readonly jobQueue: IJobQueue,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {}

	/**
	 * 處理支付失敗事件
	 *
	 * @param event - PaymentFailed 領域事件
	 */
	async handle(event: PaymentFailed): Promise<void> {
		const orderId = event.data.orderId
		const reason = event.data.reason

		const logMsg = this.translator.trans('notification.payment_failed_received', { id: orderId as string })
		this.logger.info(logMsg)

		try {
			// 準備 Job 業務資料
			const jobData: SendPaymentFailedEmailData = {
				orderId: orderId as string,
				paymentId: event.aggregateId as string,
				email: `user-order-${orderId}@example.com`, // 應從 Order Repository 取得
				customerName: 'Customer', // 應從 Order Repository 取得
				reason: reason as string,
			}

			// 構建並推送 Job
			const job = new SendPaymentFailedEmailJob(null as any, this.logger, this.translator)
			const jobPayload = job.toJobPayload(jobData)
			await this.jobQueue.push(job.jobName, jobPayload)

			this.logger.debug(`[Notification] Payment failed email job dispatched for order ${orderId}`)
		} catch (error) {
			this.logger.error(`[Notification] Failed to dispatch payment failed email job for order ${orderId}`, error)
			throw error
		}
	}
}
