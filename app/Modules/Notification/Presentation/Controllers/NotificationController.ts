/**
 * @file NotificationController.ts
 * @description Notification 模組 HTTP 控制器
 *
 * 提供以下端點：
 * - GET /notifications - 查詢通知日誌
 * - POST /notifications/send - 手動發送通知
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { Response } from 'bun'
import type { INotificationMessages } from '../Ports/INotificationMessages'

/**
 * 通知日誌
 */
interface NotificationLog {
	id: string
	type: 'email' | 'sms' | 'push'
	recipient: string
	subject: string
	content: string
	status: 'pending' | 'sent' | 'failed'
	error?: string
	createdAt: Date
	sentAt?: Date
}

/**
 * Notification 控制器
 *
 * 用途：
 * - 查詢通知發送日誌
 * - 手動觸發通知發送（測試用途）
 */
export class NotificationController {
	// 簡單的內存日誌存儲（實際應使用數據庫）
	private static logs: Map<string, NotificationLog> = new Map()

	constructor(private readonly messages: INotificationMessages) {}

	/**
	 * 查詢通知日誌
	 *
	 * @param ctx HTTP 上下文
	 * @returns 通知日誌列表
	 */
	async queryLogs(ctx: IHttpContext): Promise<Response> {
		try {
			const type = ctx.query['type'] as string | undefined
			const status = ctx.query['status'] as string | undefined
			const limit = parseInt(ctx.query['limit'] as string, 10) || 20

			// 篩選日誌
			let logs = Array.from(NotificationController.logs.values())

			if (type) {
				logs = logs.filter((log) => log.type === type)
			}

			if (status) {
				logs = logs.filter((log) => log.status === status)
			}

			// 按時間倒序排序
			logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

			// 分頁
			const paginated = logs.slice(0, limit)

			return ctx.json({
				success: true,
				data: paginated,
				meta: {
					total: logs.length,
					returned: paginated.length,
					limit,
				},
			})
		} catch (error) {
			const message = String(error)
			return ctx.json({ success: false, error: message }, 500)
		}
	}

	/**
	 * 手動發送通知（測試用途）
	 *
	 * @param ctx HTTP 上下文
	 * @returns 發送結果
	 */
	async sendNotification(ctx: IHttpContext): Promise<Response> {
		try {
			// 驗證請求體
			const body = await ctx.getJsonBody<{
				type?: string
				recipient?: string
				subject?: string
				content?: string
			}>()

			const type = body.type || 'email'
			const recipient = body.recipient

			if (!recipient) {
				return ctx.json(
					{ success: false, error: this.messages.missingRecipient() },
					400
				)
			}

			// 創建日誌項
			const logEntry: NotificationLog = {
				id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				type: type as 'email' | 'sms' | 'push',
				recipient,
				subject: body.subject || 'Test Notification',
				content: body.content || 'This is a test notification',
				status: 'sent',
				sentAt: new Date(),
				createdAt: new Date(),
			}

			// 存儲日誌
			NotificationController.logs.set(logEntry.id, logEntry)

			return ctx.json({
				success: true,
				data: logEntry,
				message: this.messages.notificationSent(),
			})
		} catch (error) {
			const message = String(error)
			return ctx.json({ success: false, error: message }, 400)
		}
	}

	/**
	 * 獲取通知統計信息
	 *
	 * @param ctx HTTP 上下文
	 * @returns 統計信息
	 */
	async getStats(ctx: IHttpContext): Promise<Response> {
		try {
			const logs = Array.from(NotificationController.logs.values())

			const stats = {
				total: logs.length,
				sent: logs.filter((log) => log.status === 'sent').length,
				failed: logs.filter((log) => log.status === 'failed').length,
				pending: logs.filter((log) => log.status === 'pending').length,
				byType: {
					email: logs.filter((log) => log.type === 'email').length,
					sms: logs.filter((log) => log.type === 'sms').length,
					push: logs.filter((log) => log.type === 'push').length,
				},
			}

			return ctx.json({
				success: true,
				data: stats,
			})
		} catch (error) {
			const message = String(error)
			return ctx.json({ success: false, error: message }, 500)
		}
	}

	/**
	 * 清除所有日誌（測試用途）
	 *
	 * @param ctx HTTP 上下文
	 * @returns 清除結果
	 */
	async clearLogs(ctx: IHttpContext): Promise<Response> {
		try {
			const count = NotificationController.logs.size
			NotificationController.logs.clear()

			return ctx.json({
				success: true,
				message: this.messages.logsCleared(),
				meta: {
					clearedCount: count,
				},
			})
		} catch (error) {
			const message = String(error)
			return ctx.json({ success: false, error: message }, 500)
		}
	}

	/**
	 * 根據 ID 獲取單個通知日誌
	 *
	 * @param ctx HTTP 上下文
	 * @returns 通知日誌項
	 */
	async getLogById(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params

			if (!id) {
				return ctx.json(
					{ success: false, error: this.messages.missingLogId() },
					400
				)
			}

			const log = NotificationController.logs.get(id)

			if (!log) {
				return ctx.json(
					{ success: false, error: this.messages.logNotFound() },
					404
				)
			}

			return ctx.json({
				success: true,
				data: log,
			})
		} catch (error) {
			const message = String(error)
			return ctx.json({ success: false, error: message }, 500)
		}
	}
}

/**
 * 導出日誌存儲（用於測試）
 */
export function getNotificationLogs(): NotificationLog[] {
	return Array.from(NotificationController.logs.values())
}

/**
 * 清除所有日誌（用於測試）
 */
export function clearNotificationLogs(): void {
	NotificationController.logs.clear()
}

/**
 * 添加日誌項（用於測試）
 */
export function addNotificationLog(log: NotificationLog): void {
	NotificationController.logs.set(log.id, log)
}
