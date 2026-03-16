/**
 * @file PortalController.ts
 * @description Portal (首頁/門戶) API 控制器。職責：作為 BFF (Backend For Frontend) 層，提供 API 端點聚合各個模組的資料。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IPortalQueryService } from '../../Application/Queries/IPortalQueryService'

/**
 * Portal API 控制器
 * 提供 API 端點，回傳 JSON 格式資料
 */
export class PortalController {
  /**
   * 建立 PortalController 實例
   * @param portalQuery Portal 查詢服務實例，用於資料聚合
   */
  constructor(private readonly portalQuery: IPortalQueryService) {}

  /**
   * GET /api/portal/data (API 端點)
   * 回傳首頁聚合資料（JSON 格式）
   * @param ctx HTTP 上下文，包含 Request 與 Response 工具
   * @returns 包含首頁資料的 JSON 響應
   * @throws 當查詢失敗時，回傳 500 錯誤並包含錯誤訊息
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
