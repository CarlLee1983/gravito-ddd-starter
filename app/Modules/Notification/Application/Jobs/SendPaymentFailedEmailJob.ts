/**
 * @file SendPaymentFailedEmailJob.ts
 * @description 發送支付失敗通知信的背景工作 Job
 *
 * Role: Application Layer - Job abstraction
 */

import { BaseJob } from '@/Foundation/Application/Jobs/BaseJob'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 支付失敗信 Job 的業務資料
 */
export interface SendPaymentFailedEmailData {
	/** 訂單 ID */
	orderId: string
	/** 支付 ID */
	paymentId: string
	/** 收件人電郵 */
	email: string
	/** 客戶名稱 */
	customerName: string
	/** 失敗原因 */
	reason: string
}

/**
 * 發送支付失敗信 Job 實作
 */
export class SendPaymentFailedEmailJob extends BaseJob<SendPaymentFailedEmailData> {
	/**
	 * Job 識別碼
	 */
	readonly jobName = 'notification.send_payment_failed_email'

	/**
	 * 重試次數
	 */
	readonly tries = 3

	/**
	 * 重試延遲（秒）
	 */
	readonly backoff = 60

	/**
	 * 初始延遲（秒）
	 */
	readonly delay = 0

	/**
	 * 建構子
	 */
	constructor(
		private readonly mailer: IMailer,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {
		super()
	}

	/**
	 * 發送支付失敗信
	 */
	async handle(data: SendPaymentFailedEmailData): Promise<void> {
		const { orderId, email, customerName, reason } = data

		const logMsg = this.translator.trans('notification.payment_failed_email_sending', { id: orderId })
		this.logger.info(logMsg)

		try {
			const subject = this.translator.trans('notification.payment_failed_subject', { orderId })
			const content = this.translator.trans('notification.payment_failed_body', {
				name: customerName,
				orderId,
				reason,
			})

			await this.mailer.send({
				to: email,
				subject,
				text: content,
			})

			this.logger.debug(`[Notification] Payment failed email sent successfully for order ${orderId}`)
		} catch (error) {
			this.logger.error(`[Notification] Failed to send payment failed email to ${email}`, error)
			throw error
		}
	}
}
