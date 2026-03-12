/**
 * @file UserCreatedHandler.ts
 * @description 當 User 模組發布 UserCreated 事件時，Post 模組的應對邏輯
 *
 * 展示跨 Bounded Context 事件驅動設計（遵循 DDD 原則）：
 * - Post 模組訂閱 User 模組的 UserCreatedIntegrationEvent（非 Domain Event）
 * - 完全不依賴 User 模組的內部實現
 * - 自動為新用戶建立歡迎文章
 * - 完全解耦的非同步通訊
 */

import type { IntegrationEvent } from '@/Shared/Domain/IntegrationEvent'
import type { ILogger } from '@/Shared/Infrastructure/ILogger'
import { CreatePostService } from '../Services/CreatePostService'

/**
 * 跨 Bounded Context 事件處理器
 *
 * 在 DDD 架構中作為「事件訂閱者 (Event Subscriber)」的 ACL 層。
 * 展示了執行序上的解耦：Post 模組不直接被 User 模組調用，而是監聽 Integration Event。
 *
 * **職責**：
 * 1. 訂閱 User Context 的 UserCreated 整合事件
 * 2. 呼叫 CreatePostService 為新用戶建立歡迎文章
 * 3. 處理錯誤（使用防腐層 (ACL) 模式恢復）
 *
 * **設計優勢**：
 * - Post 模組完全不知道 User 模組的 Domain Event 或實現
 * - 如果 User Context 改變內部事件結構，Post 只需更新轉換邏輯
 * - 清晰的 Bounded Context 邊界
 */
export class UserCreatedHandler {
  /**
   * 建立 UserCreatedHandler 實例
   *
   * @param postService - Post 模組的建立文章應用服務
   * @param logger - 日誌服務
   */
  constructor(
    private postService: CreatePostService,
    private logger: ILogger
  ) {}

  /**
   * 處理 UserCreated 整合事件
   *
   * 當收到新用戶建立事件時，自動為該用戶建立一篇歡迎文章。
   *
   * @param event - 來自 User Context 的 IntegrationEvent
   */
  async handle(event: IntegrationEvent): Promise<void> {
    // 驗證事件來源和型別
    if (event.eventType !== 'UserCreated' || event.sourceContext !== 'User') {
      return
    }

    try {
      const userId = event.data.userId as string
      const userName = event.data.name as string

      // 自動為新用戶創建歡迎文章
      await this.postService.execute({
        id: `welcome-post-${userId}`,
        title: `歡迎來到我的部落格，${userName}！`,
        content: `親愛的 ${userName}，\n\n歡迎加入我們的社區！🎉\n\n這是您的第一篇文章，請盡情分享您的想法和經驗。\n\n祝您寫作愉快！`,
        authorId: userId,
      })

      this.logger.info(`✨ [Post Module] 為用戶 ${userId} (${userName}) 建立了歡迎文章`)
    } catch (error) {
      // 記錄錯誤但不中斷流程（防腐層應對）
      // 建立歡迎文章失敗不應該阻止用戶建立
      const userId = event.data.userId || 'unknown'
      this.logger.error(`[Post Module] 為用戶 ${userId} 建立歡迎文章失敗`, error instanceof Error ? error : new Error(String(error)))
    }
  }
}
