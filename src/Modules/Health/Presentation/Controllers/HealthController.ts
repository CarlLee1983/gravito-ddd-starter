/**
 * HealthController
 * 健康檢查控制器 (HTTP 處理)
 */

import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthController {
  /**
   * GET /health
   * 執行健康檢查並返回結果
   */
  async check(ctx: GravitoContext): Promise<any> {
    try {
      const core = ctx.get('core') as PlanetCore

      // 從容器注入服務
      const service = core.container.make('healthCheckService') as PerformHealthCheckService

      // 獲取資源（可能為 undefined，服務需要處理）
      const db = core.get('db')
      const redis = core.get('redis')
      const cache = core.get('cache')

      // 執行健康檢查
      const result = await service.execute(db, redis, cache)

      // 根據狀態返回適當的 HTTP 狀態碼
      const statusCode = result.status === 'unhealthy' ? 503 : 200

      return ctx.json(
        {
          success: true,
          status: result.status,
          timestamp: result.timestamp,
          checks: result.checks,
          message: result.message
        },
        statusCode
      )
    } catch (error: any) {
      console.error('Health check error:', error)
      return ctx.json(
        {
          success: false,
          status: 'unhealthy',
          message: error.message || 'Health check failed'
        },
        503
      )
    }
  }

  /**
   * GET /health/history
   * 獲取健康檢查歷史
   */
  async history(ctx: GravitoContext): Promise<any> {
    try {
      const core = ctx.get('core') as PlanetCore
      const service = core.container.make('healthCheckService') as PerformHealthCheckService

      const limit = parseInt(ctx.req.query.limit || '10')
      const validLimit = Math.min(Math.max(limit, 1), 100) // 1-100 之間

      const records = await service.getHistory(validLimit)

      return ctx.json({
        success: true,
        data: records.map((r) => r.toJSON()),
        meta: {
          count: records.length,
          limit: validLimit
        }
      })
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: error.message
        },
        500
      )
    }
  }
}
