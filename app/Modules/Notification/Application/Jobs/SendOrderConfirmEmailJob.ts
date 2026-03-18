/**
 * @file SendOrderConfirmEmailJob.ts
 * @description 發送訂單確認信的背景工作 Job
 *
 * Role: Application Layer - Job abstraction
 */

import { BaseJob } from '@/Foundation/Application/Jobs/BaseJob'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 訂單確認信 Job 的業務資料
 */
export interface SendOrderConfirmEmailData {
	/** 訂單 ID */
	orderId: string
	/** 收件人電郵 */
	email: string
	/** 訂單總金額 */
	amount: number
	/** 客戶名稱 */
	customerName: string
	/** 貨幣 */
	currency: string
}

/**
 * 發送訂單確認信 Job 實作
 */
export class SendOrderConfirmEmailJob extends BaseJob<SendOrderConfirmEmailData> {
	/**
	 * Job 識別碼
	 */
	readonly jobName = 'notification.send_order_confirm_email'

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
	 * 發送訂單確認信
	 */
	async handle(data: SendOrderConfirmEmailData): Promise<void> {
		const { orderId, email, amount, customerName, currency } = data

		const logMsg = this.translator.trans('notification.order_confirm_email_sending', { id: orderId })
		this.logger.info(logMsg)

		try {
			const subject = this.translator.trans('notification.order_confirm_subject', { orderId })
			const content = this.translator.trans('notification.order_confirm_body', {
				name: customerName,
				orderId,
				amount: `${amount} ${currency}`,
			})

			await this.mailer.send({
				to: email,
				subject,
				text: content,
			})

			this.logger.debug(`[Notification] Order confirm email sent successfully for order ${orderId}`)
		} catch (error) {
			this.logger.error(`[Notification] Failed to send order confirm email to ${email}`, error)
			throw error
		}
	}
}
