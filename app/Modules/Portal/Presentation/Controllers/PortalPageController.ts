/**
 * @file PortalPageController.ts
 * @description Portal 模組頁面控制器。負責首頁、行銷頁面等前端應用 (SPA/SSR) 的頁面渲染邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IPortalQueryService } from '../Queries/IPortalQueryService'

/**
 * Portal 頁面控制器
 * 聚合各模組資料並渲染首頁等前端頁面。
 */
export class PortalPageController {
  /**
   * 建立 PortalPageController 實例
   * @param portalQuery Portal 查詢服務實例，用於渲染所需資料的聚合
   */
  constructor(private readonly portalQuery: IPortalQueryService) {}

  /**
   * 顯示首頁
   * 聚合首頁資料並渲染前端組件 (Welcome/Home)
   * @param ctx HTTP 上下文，提供渲染工具
   * @returns 渲染後的 HTML 響應
   * @throws 當資料聚合或渲染失敗時，回傳 500 錯誤
   */
  async showIndex(ctx: IHttpContext): Promise<Response> {
    try {
      const homeData = await this.portalQuery.getHomePageData()
      return ctx.render('Welcome', homeData)
    } catch (error) {
      return ctx.json(
        {
          error: '無法加載首頁',
          details: error instanceof Error ? error.message : String(error)
        },
        500
      )
    }
  }
}
