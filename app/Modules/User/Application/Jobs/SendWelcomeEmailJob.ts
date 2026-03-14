/**
 * @file SendWelcomeEmailJob.ts
 * @description 發送歡迎信的背景工作 Job
 *
 * 本 Job 從隊列執行，負責實際發送歡迎信。
 * 與事件 Handler 不同：
 * - Handler (SendWelcomeEmail): 同步接收事件，dispatcher Job 到隊列
 * - Job (SendWelcomeEmailJob): 異步執行，實現重試、延遲等配置
 *
 * 重試策略：
 * - tries: 3 (最多執行 3 次)
 * - backoff: 60 (重試延遲 60 秒)
 * - delay: 0 (立即執行)
 *
 * Role: Application Layer - Job Abstraction
 */

import { BaseJob } from '@/Foundation/Application/Jobs/BaseJob'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 發送歡迎信 Job 的業務資料
 */
export interface SendWelcomeEmailData {
	/** 用戶 ID */
	userId: string
	/** 用戶名稱 */
	name: string
	/** 用戶郵箱 */
	email: string
}

/**
 * 發送歡迎信 Job 實作
 *
 * @example
 * ```typescript
 * const job = new SendWelcomeEmailJob(mailer, logger, translator)
 * await dispatchJob(jobQueue, job, {
 *   userId: 'usr-123',
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * })
 * ```
 */
export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
	/**
	 * Job 識別碼（用於隊列識別與路由）
	 */
	readonly jobName = 'user.send_welcome_email'

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
	 * 0 表示立即執行
	 */
	readonly delay = 0

	/**
	 * 建構子
	 *
	 * @param mailer - 郵件服務
	 * @param logger - 日誌服務
	 * @param translator - 多語系翻譯服務
	 */
	constructor(
		private readonly mailer: IMailer,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {
		super()
	}

	/**
	 * Job 業務邏輯實作
	 *
	 * 負責實際發送歡迎信。若拋出異常，隊列會根據 tries/backoff 配置重試。
	 *
	 * @param data - Job 業務資料（來自 JobPayload）
	 * @throws 若郵件發送失敗且已達重試次數上限，異常會被記錄
	 */
	async handle(data: SendWelcomeEmailData): Promise<void> {
		const { userId, name, email } = data

		// 1. 使用 Logger 記錄（多語系日誌）
		const logMsg = this.translator.trans('user.welcome_email_sending', { id: userId })
		this.logger.info(logMsg)

		try {
			// 2. 準備信件內容（多語系）
			const subject = this.translator.trans('user.welcome_subject', { name })
			const content = this.translator.trans('user.welcome_body', { name })

			// 3. 實際發送郵件
			// NOTE: 與 SendWelcomeEmail Handler 不同，此處直接發送，不再透過 mailer.queue()
			// 因為 Job 本身就是在隊列中執行的
			await this.mailer.send({
				to: email,
				subject: subject,
				text: content,
			})

			this.logger.debug(`[User] Welcome email sent successfully for ${email}`)
		} catch (error) {
			// 記錄錯誤，但不在此處決定是否重試
			// 隊列會根據異常決定是否重試
			this.logger.error(`[User] Failed to send welcome email to ${email}`, error)
			throw error // 拋出以告訴隊列此 Job 執行失敗
		}
	}
}
