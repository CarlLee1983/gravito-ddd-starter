/**
 * @file SendWelcomeEmail.ts
 * @description 當用戶建立時發送歡迎信的處理程序
 */

import type { UserCreated } from '../Domain/Events/UserCreated'
import type { IMailer } from '@/Shared/Infrastructure/IMailer'
import type { ILogger } from '@/Shared/Infrastructure/ILogger'
import type { ITranslator } from '@/Shared/Infrastructure/ITranslator'

/**
 * 歡迎信發送程序 (事件訂閱者)
 */
export class SendWelcomeEmail {
	constructor(
		private readonly mailer: IMailer,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {}

	/**
	 * 處理事件
	 */
	async handle(event: UserCreated): Promise<void> {
		const { name, email, userId } = event

		// 1. 使用 Logger 記錄 (多語系日誌)
		const logMsg = this.translator.trans('user.created_log', { id: userId })
		this.logger.info(logMsg)

		// 2. 準備信件內容 (多語系信件)
		const subject = this.translator.trans('user.welcome_subject', { name })
		const content = this.translator.trans('user.welcome_body', { name })

		// 3. 透過隊列發送歡迎信 (非同步)
		try {
			await this.mailer.queue({
				to: email,
				subject: subject,
				text: content
			})
			this.logger.debug(`[User] Welcome email queued for ${email}`)
		} catch (error) {
			this.logger.error(`[User] Failed to queue welcome email for ${email}`, error)
		}
	}
}
