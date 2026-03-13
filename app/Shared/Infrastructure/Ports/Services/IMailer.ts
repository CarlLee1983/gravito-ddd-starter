/**
 * @file IMailer.ts
 * @description 郵件發送服務介面 (Port)
 */

export interface MailOptions {
	to: string | string[]
	subject: string
	template?: string
	data?: Record<string, any>
	text?: string
	html?: string
	from?: string
	attachments?: any[]
}

export interface IMailer {
	/**
	 * 發送郵件
	 */
	send(options: MailOptions): Promise<void>

	/**
	 * 排隊發送郵件 (非同步)
	 */
	queue(options: MailOptions): Promise<void>
}
