/**
 * @file UserCreatedHandler.ts
 * @description 當 User 模組發布 UserCreated 事件時，Post 模組的應對邏輯
 *
 * 展示跨 Bounded Context 事件驅動設計：
 * - Post 模組訂閱 User 模組的 UserCreated 事件
 * - 自動為新用戶建立歡迎文章
 * - 完全解耦的非同步通訊
 */

import type { UserCreated } from '@/Modules/User/Domain/Events/UserCreated'
import { CreatePostService } from '../Services/CreatePostService'

/**
 * 跨 Bounded Context 事件處理器
 *
 * 在 DDD 架構中作為「事件訂閱者 (Event Subscriber)」。
 * 展示了執行序上的解耦：Post 模組不直接被 User 模組調用，而是監聽事件。
 *
 * **職責**：
 * 1. 訂閱 User 模組的 UserCreated 事件
 * 2. 調用 CreatePostService 為新用戶建立歡迎文章
 * 3. 處理錯誤（使用防腐層 (ACL) 模式恢復）
 */
export class UserCreatedHandler {
  /**
   * 建立 UserCreatedHandler 實例
   *
   * @param postService - Post 模組的建立文章應用服務
   */
  constructor(private postService: CreatePostService) {}

  /**
   * 處理 UserCreated 事件
   *
   * 當收到新用戶建立事件時，自動為該用戶建立一篇歡迎文章。
   *
   * @param event - UserCreated 領域事件
   */
  async handle(event: UserCreated): Promise<void> {
    try {
      // 自動為新用戶創建歡迎文章
      await this.postService.execute({
        id: `welcome-post-${event.userId}`,
        title: `歡迎來到我的部落格，${event.name}！`,
        content: `親愛的 ${event.name}，\n\n歡迎加入我們的社區！🎉\n\n這是您的第一篇文章，請盡情分享您的想法和經驗。\n\n祝您寫作愉快！`,
        authorId: event.userId,
      })

      console.log(`✨ [Post Module] 為用戶 ${event.userId} (${event.name}) 建立了歡迎文章`)
    } catch (error) {
      // 記錄錯誤但不中斷流程（防腐層應對）
      // 建立歡迎文章失敗不應該阻止用戶建立
      console.error(`⚠️  [Post Module] 為用戶 ${event.userId} 建立歡迎文章失敗: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
