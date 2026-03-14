/**
 * @file PortalQueryService.ts
 * @description Portal 查詢服務實現。負責聚合多個模組的資料提供給首頁使用（BFF 聚合層）
 */

import type { IPortalQueryService, HomePageData } from '../../Presentation/Queries/IPortalQueryService'
import type { IProductQueryService } from '@/Modules/Product/Application/Queries/IProductQueryService'

/**
 * Portal 查詢服務實現
 * 負責聚合各模組的讀側服務
 */
export class PortalQueryService implements IPortalQueryService {
  /**
   * 硬編碼的公告資料（後續應移至 CMS 或資料庫）
   */
  private readonly announcements = [
    { id: 1, title: 'Summer Sale is Here!', date: '2026-03-10' },
    { id: 2, title: 'New Arrival: Atomic Design Toolkit', date: '2026-03-08' }
  ]

  /**
   * 建立 PortalQueryService 實例
   * @param productQuery 商品模組查詢服務，可用於取得精選商品
   */
  constructor(private readonly productQuery: IProductQueryService | null) {}

  /**
   * 取得首頁聚合資料，包含英雄區塊、精選商品、公告與 Meta 資訊
   * @returns 包含首頁所有必要資料的 Promise
   */
  async getHomePageData(): Promise<HomePageData> {
    // 並行查詢各模組的資料
    const products = await this.getFeaturedProducts()

    return {
      hero: {
        title: 'Welcome to Gravito DDD Store',
        subtitle: 'Experience the power of Domain-Driven Design and Clean Architecture',
        bannerUrl: '/images/hero-banner.jpg'
      },
      featuredProducts: products,
      announcements: this.announcements,
      meta: {
        title: 'Gravito Store | Home',
        description: 'The best products with the best architecture'
      }
    }
  }

  /**
   * 取得精選商品（前 4 項）
   * @returns 精選商品的陣列，若查詢失敗或服務不可用則回傳空陣列
   */
  private async getFeaturedProducts(): Promise<
    Array<{
      id: string
      name: string
      price: number
      imageUrl?: string
    }>
  > {
    if (!this.productQuery) {
      return []
    }

    try {
      const products = await this.productQuery.findAll()
      return products.slice(0, 4).map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl
      }))
    } catch {
      // 容錯：Product 查詢失敗時回傳空陣列
      return []
    }
  }
}
