/**
 * @file PortalPageController.ts
 * @description Portal 模組頁面控制器
 *
 * 負責首頁、行銷頁面等前端應用 (SPA/SSR) 的頁面渲染邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IPortalQueryService } from '../Queries/IPortalQueryService'

/**
 * Portal 頁面控制器
 *
 * 聚合各模組資料並渲染首頁等前端頁面。
 */
export class PortalPageController {
  constructor(private readonly portalQuery: IPortalQueryService) {}

  /**
   * 顯示首頁
   * 聚合首頁資料並渲染前端組件 (Welcome/Home)
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
