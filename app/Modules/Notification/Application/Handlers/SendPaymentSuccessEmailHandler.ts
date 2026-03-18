/**
 * @file SendPaymentSuccessEmailHandler.ts
 * @description 支付成功事件 Handler，dispatch 成功信 Job 到隊列
 *
 * 訂閱 PaymentSucceeded 事件，提取必要資料並推送 SendPaymentSuccessEmailJob 到隊列。
 * Role: Application Layer - Event handler
 */

import { SendPaymentSuccessEmailJob, type SendPaymentSuccessEmailData } from '../Jobs/SendPaymentSuccessEmailJob'
import { PaymentSucceeded } from '../../Domain/Events/PaymentSucceeded'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 支付成功信 Handler
 *
 * 訂閱 PaymentSucceeded 事件，當支付成功時發送確認信通知
 */
export class SendPaymentSuccessEmailHandler {
	constructor(
		private readonly jobQueue: IJobQueue,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {}

	/**
	 * 處理支付成功事件
	 *
	 * @param event - PaymentSucceeded 領域事件
	 */
	async handle(event: PaymentSucceeded): Promise<void> {
		const orderId = event.data.orderId
		const transactionId = event.data.transactionId

		const logMsg = this.translator.trans('notification.payment_succeeded_received', { id: orderId as string })
		this.logger.info(logMsg)

		try {
			// 準備 Job 業務資料
			const jobData: SendPaymentSuccessEmailData = {
				orderId: orderId as string,
				paymentId: event.aggregateId as string,
				email: `user-order-${orderId}@example.com`, // 應從 Order Repository 取得
				amount: 100, // 應從 Order Repository 取得
				customerName: 'Customer', // 應從 Order Repository 取得
				currency: 'USD', // 應從 Order Repository 取得
				transactionId: transactionId as string,
			}

			// 構建並推送 Job
			const job = new SendPaymentSuccessEmailJob(null as any, this.logger, this.translator)
			const jobPayload = job.toJobPayload(jobData)
			await this.jobQueue.push(job.jobName, jobPayload)

			this.logger.debug(`[Notification] Payment success email job dispatched for order ${orderId}`)
		} catch (error) {
			this.logger.error(`[Notification] Failed to dispatch payment success email job for order ${orderId}`, error)
			throw error
		}
	}
}
