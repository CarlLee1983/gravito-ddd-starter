/**
 * @file GravitoMailAdapter.ts
 * @description 對接 @gravito/signal 的郵件適配器
 */

import type { IMailer, MailOptions } from '../IMailer'

export class GravitoMailAdapter implements IMailer {
	/**
	 * 直接發送
	 */
	async send(options: MailOptions): Promise<void> {
		console.info(`[MAIL] Sending email to ${options.to} with subject: ${options.subject}`)
		// TODO: 整合 @gravito/signal
	}

	/**
	 * 排隊發送
	 */
	async queue(options: MailOptions): Promise<void> {
		console.info(`[MAIL] Queueing email to ${options.to} with subject: ${options.subject}`)
		// TODO: 整合 @gravito/signal
	}
}
