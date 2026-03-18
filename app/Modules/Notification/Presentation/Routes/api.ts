/**
 * @file api.ts
 * @description Notification 模組路由定義
 *
 * 端點：
 * - GET /notifications - 查詢通知日誌
 * - GET /notifications/:id - 根據 ID 獲取單個日誌
 * - POST /notifications/send - 發送通知
 * - GET /notifications/stats - 獲取統計信息
 * - DELETE /notifications/logs - 清除所有日誌
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { NotificationController } from '../Controllers/NotificationController'

/**
 * 註冊 Notification 模組路由
 *
 * @param router - 模組路由器
 * @param controller - Notification 控制器
 */
export function registerNotificationRoutes(
	router: IModuleRouter,
	controller: NotificationController
): void {
	// 查詢通知日誌
	router.get('/notifications', (ctx) => controller.queryLogs(ctx))

	// 根據 ID 獲取單個日誌
	router.get('/notifications/:id', (ctx) => controller.getLogById(ctx))

	// 發送通知（測試用途）
	router.post('/notifications/send', (ctx) => controller.sendNotification(ctx))

	// 獲取統計信息
	router.get('/notifications/stats', (ctx) => controller.getStats(ctx))

	// 清除所有日誌（測試用途）
	router.delete('/notifications/logs', (ctx) => controller.clearLogs(ctx))
}
