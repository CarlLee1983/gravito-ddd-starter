/**
 * @file GravitoMailAdapter.ts
 * @description 對接 @gravito/signal 的郵件適配器
 */

import type { IMailer, MailOptions } from '../../Ports/Services/IMailer'
import type { ILogger } from '../../Ports/Services/ILogger'

export class GravitoMailAdapter implements IMailer {
	private logger: ILogger = {
		info: (msg: string) => console.info(`[GravitoMailAdapter] ${msg}`),
		warn: (msg: string) => console.warn(`[GravitoMailAdapter] ${msg}`),
		error: (msg: string, err?: any) => console.error(`[GravitoMailAdapter] ${msg}`, err),
		debug: (msg: string) => console.debug(`[GravitoMailAdapter] ${msg}`),
	}

	/**
	 * 直接發送
	 */
	async send(options: MailOptions): Promise<void> {
		this.logger.info(`Sending email to ${options.to} with subject: ${options.subject}`)
		// TODO: 整合 @gravito/signal
	}

	/**
	 * 排隊發送
	 */
	async queue(options: MailOptions): Promise<void> {
		this.logger.info(`Queueing email to ${options.to} with subject: ${options.subject}`)
		// TODO: 整合 @gravito/signal
	}
}
