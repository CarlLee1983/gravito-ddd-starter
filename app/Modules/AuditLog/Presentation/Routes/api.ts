/**
 * @file api.ts
 * @description AuditLog 模組路由定義
 *
 * 端點：
 * - GET /audit-logs - 查詢審計日誌
 *
 * Role: Presentation Layer - Routes
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { AuditLogController } from '../Controllers/AuditLogController'

/**
 * 註冊 AuditLog 模組路由
 */
export function registerAuditLogRoutes(
	router: IModuleRouter,
	controller: AuditLogController
): void {
	router.get('/audit-logs', (ctx) => controller.queryAuditLogs(ctx))
}
