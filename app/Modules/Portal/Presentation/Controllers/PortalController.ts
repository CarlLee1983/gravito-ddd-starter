/**
 * @file PortalController.ts
 * @description Portal (首頁/門戶) 控制器
 *
 * 職責：作為 BFF (Backend For Frontend) 層，聚合各個模組的資料提供給首頁使用。
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IProductQueryService } from '@/Modules/Product/Application/Queries/IProductQueryService'

export class PortalController {
  constructor(
    private readonly productQuery: IProductQueryService
    // 可以在這裡加入更多讀側服務，例如 Post、Marketing 等
  ) {}

  /**
   * GET / (頁面渲染)
   * 聚合首頁資料並渲染前端組件 (Home/Welcome)
   */
  async renderHome(ctx: IHttpContext): Promise<Response> {
    try {
      const products = await this.productQuery.findAll()
      
      const homeData = {
        hero: {
          title: 'Welcome to Gravito DDD Store',
          subtitle: 'Experience the power of Domain-Driven Design and Clean Architecture',
          bannerUrl: '/images/hero-banner.jpg'
        },
        featuredProducts: products.slice(0, 4),
        announcements: [
          { id: 1, title: 'Summer Sale is Here!', date: '2026-03-10' },
          { id: 2, title: 'New Arrival: Atomic Design Toolkit', date: '2026-03-08' }
        ],
        meta: {
          title: 'Gravito Store | Home',
          description: 'The best products with the best architecture'
        }
      }

      // 渲染前端 Home 組件並帶入資料
      return ctx.render('Welcome', homeData)
    } catch (error) {
      // 錯誤處理
      return ctx.json({ error: '無法加載首頁', details: error instanceof Error ? error.message : String(error) }, 500)
    }
  }

  /**
   * GET /api/portal/data (API 端點)
   * 僅回傳 JSON 資料
   */
  async getHome(ctx: IHttpContext): Promise<Response> {
    try {
      const products = await this.productQuery.findAll()
      
      const homeData = {
        hero: {
          title: 'Welcome to Gravito DDD Store',
          subtitle: 'Experience the power of Domain-Driven Design and Clean Architecture',
          bannerUrl: '/images/hero-banner.jpg'
        },
        featuredProducts: products.slice(0, 4),
        announcements: [
          { id: 1, title: 'Summer Sale is Here!', date: '2026-03-10' },
          { id: 2, title: 'New Arrival: Atomic Design Toolkit', date: '2026-03-08' }
        ],
        meta: {
          title: 'Gravito Store | Home',
          description: 'The best products with the best architecture'
        }
      }

      return ctx.json({
        success: true,
        data: homeData
      })
    } catch (error) {
      return ctx.json({
        success: false,
        error: error instanceof Error ? error.message : '取得首頁資料失敗'
      }, 500)
    }
  }
}
