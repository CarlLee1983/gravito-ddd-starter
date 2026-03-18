/**
 * @file SendOrderConfirmEmailHandler.ts
 * @description 訂單確認事件 Handler，dispatch 確認信 Job 到隊列
 *
 * 訂閱 OrderPlaced 事件，提取必要資料並推送 SendOrderConfirmEmailJob 到隊列。
 * Role: Application Layer - Event handler
 */

import { SendOrderConfirmEmailJob, type SendOrderConfirmEmailData } from '../Jobs/SendOrderConfirmEmailJob'
import { OrderPlaced } from '../../Domain/Events/OrderPlaced'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 訂單確認信 Handler
 *
 * 訂閱 OrderPlaced 事件，當訂單建立時發送確認信通知
 */
export class SendOrderConfirmEmailHandler {
	constructor(
		private readonly jobQueue: IJobQueue,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {}

	/**
	 * 處理訂單建立事件
	 *
	 * @param event - OrderPlaced 領域事件
	 */
	async handle(event: OrderPlaced): Promise<void> {
		const { orderId, userId, total, currency } = event.data

		const logMsg = this.translator.trans('notification.order_placed_received', { id: orderId as string })
		this.logger.info(logMsg)

		try {
			// 準備 Job 業務資料
			const jobData: SendOrderConfirmEmailData = {
				orderId: orderId as string,
				email: `user-${userId as string}@example.com`, // 這裡應從 User Repository 取得真實 email
				amount: total as number,
				customerName: `Customer ${userId as string}`, // 應從 User Repository 取得
				currency: currency as string,
			}

			// 構建並推送 Job
			const job = new SendOrderConfirmEmailJob(null as any, this.logger, this.translator)
			const jobPayload = job.toJobPayload(jobData)
			await this.jobQueue.push(job.jobName, jobPayload)

			this.logger.debug(`[Notification] Order confirm email job dispatched for order ${orderId}`)
		} catch (error) {
			this.logger.error(`[Notification] Failed to dispatch order confirm email job for order ${orderId}`, error)
			throw error
		}
	}
}
