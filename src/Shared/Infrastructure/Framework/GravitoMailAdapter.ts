/**
 * @file GravitoMailAdapter.ts
 * @description 對接 @gravito/signal 的郵件適配器
 */

import type { IMailer, MailOptions } from '../IMailer'
import { Signal } from '@gravito/signal'

export class GravitoMailAdapter implements IMailer {
	private signal: Signal

	constructor(signal: Signal) {
		this.signal = signal
	}

	/**
	 * 直接發送
	 */
	async send(options: MailOptions): Promise<void> {
		// 將系統介面轉化為 Signal 參數
		await this.signal.mail({
			to: options.to,
			subject: options.subject,
			content: options.html || options.text || '',
			from: options.from,
			// 其他對接參數...
		})
	}

	/**
	 * 排隊發送
	 */
	async queue(options: MailOptions): Promise<void> {
		// 利用 Signal 內建的隊列功能或委託給我們的 IJobQueue
		await this.signal.mail({
			to: options.to,
			subject: options.subject,
			content: options.html || options.text || '',
			from: options.from,
			queue: true
		})
	}
}
