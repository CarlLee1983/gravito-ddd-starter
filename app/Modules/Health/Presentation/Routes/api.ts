/**
 * @file api.ts
 * @description 定義健康檢查模組的 API 路由
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { HealthController } from '../Controllers/HealthController'

/**
 * 註冊健康檢查路由
 * 
 * @param router - 框架無關的模組路由介面
 * @param controller - 已組裝的控制器實例
 */
export function registerHealthRoutes(
	router: IModuleRouter,
	controller: HealthController,
): void {
	/**
	 * GET /health
	 * 執行健康檢查並返回各系統組件狀態
	 */
	router.get('/health', (ctx) => controller.check(ctx))

	/**
	 * GET /health/history
	 * 獲取過往健康檢查記錄
	 */
	router.get('/health/history', (ctx) => controller.history(ctx))
}
