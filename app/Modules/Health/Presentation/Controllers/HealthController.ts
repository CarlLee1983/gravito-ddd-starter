/**
 * @file HealthController.ts
 * @description 處理系統健康檢查相關的 HTTP 請求
 * @module src/Modules/Health/Presentation/Controllers
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

/**
 * HealthController 類別
 * 
 * 在 DDD 架構中屬於「表現層 (Presentation Layer)」。
 * 負責接收外部檢查請求，從 HTTP 上下文中提取基礎設施組件 (如 DB)，並調用應用服務執行檢查。
 */
export class HealthController {
	/**
	 * 建立 HealthController 實例
	 * 
	 * @param service - 執行健康檢查的應用服務實例
	 */
	constructor(private service: PerformHealthCheckService) {}

	/**
	 * 執行系統健康檢查
	 * 
	 * 此方法會從 context 中獲取 Wiring 層注入的原始資源 (db, redis, cache)。
	 * 
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含健康檢查結果的 HTTP 響應
	 */
	async check(ctx: IHttpContext): Promise<Response> {
		try {
			// 執行健康檢查
			const result = await this.service.execute()

			// 根據狀態返回適當的 HTTP 狀態碼
			const statusCode = result.status === 'unhealthy' ? 503 : 200

			return ctx.json(
				{
					success: true,
					status: result.status,
					timestamp: result.timestamp,
					checks: result.checks,
					message: result.message,
				},
				statusCode,
			)
		} catch (error: any) {
			console.error('Health check error:', error)
			return ctx.json(
				{
					success: false,
					status: 'unhealthy',
					message: error.message || 'Health check failed',
				},
				503,
			)
		}
	}

	/**
	 * 獲取健康檢查歷史記錄
	 * 
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含歷史記錄列表的 HTTP 響應
	 */
	async history(ctx: IHttpContext): Promise<Response> {
		try {
			const limit = parseInt(ctx.query.limit || '10')
			const validLimit = Math.min(Math.max(limit, 1), 100) // 1-100 之間

			const records = await this.service.getHistory(validLimit)

			return ctx.json({
				success: true,
				data: records.map((r) => r.toJSON()),
				meta: {
					count: records.length,
					limit: validLimit,
				},
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message,
				},
				500,
			)
		}
	}
}
