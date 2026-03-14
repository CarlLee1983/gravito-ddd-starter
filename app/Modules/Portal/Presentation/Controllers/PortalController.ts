/**
 * @file PortalController.ts
 * @description Portal (首頁/門戶) API 控制器
 *
 * 職責：作為 BFF (Backend For Frontend) 層，提供 API 端點聚合各個模組的資料。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IPortalQueryService } from '../Queries/IPortalQueryService'

/**
 * Portal API 控制器
 * 提供 API 端點，回傳 JSON 格式資料
 */
export class PortalController {
  constructor(private readonly portalQuery: IPortalQueryService) {}

  /**
   * GET /api/portal/data (API 端點)
   * 回傳首頁聚合資料（JSON 格式）
   */
  async getHome(ctx: IHttpContext): Promise<Response> {
    try {
      const homeData = await this.portalQuery.getHomePageData()

      return ctx.json({
        success: true,
        data: homeData
      })
    } catch (error) {
      return ctx.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '取得首頁資料失敗'
        },
        500
      )
    }
  }
}
