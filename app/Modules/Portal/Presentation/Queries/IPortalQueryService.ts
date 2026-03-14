/**
 * @file IPortalQueryService.ts
 * @description Portal 查詢服務介面 (Port)
 */

/**
 * 首頁資料結構
 */
export interface HomePageData {
  hero: {
    title: string
    subtitle: string
    bannerUrl: string
  }
  featuredProducts: Array<{
    id: string
    name: string
    price: number
    imageUrl?: string
  }>
  announcements: Array<{
    id: number
    title: string
    date: string
  }>
  meta: {
    title: string
    description: string
  }
}

/**
 * Portal 查詢服務
 * 負責聚合各模組的資料提供給首頁使用
 */
export interface IPortalQueryService {
  /**
   * 取得首頁聚合資料
   */
  getHomePageData(): Promise<HomePageData>
}
