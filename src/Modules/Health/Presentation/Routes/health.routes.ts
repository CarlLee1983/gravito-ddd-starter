/**
 * Health Routes
 * 健康檢查模組的路由定義
 */

import type { PlanetCore } from '@gravito/core'
import { HealthController } from '../Controllers/HealthController'

/**
 * 註冊健康檢查路由
 */
export async function registerHealthRoutes(core: PlanetCore): Promise<void> {
  const controller = new HealthController()

  /**
   * GET /health
   * 執行健康檢查
   * 返回: { success, status, timestamp, checks, message }
   */
  core.router.get('/health', (ctx) => controller.check(ctx))

  /**
   * GET /health/history?limit=10
   * 獲取健康檢查歷史
   * 參數: limit (可選, 預設 10, 最多 100)
   */
  core.router.get('/health/history', (ctx) => controller.history(ctx))
}
