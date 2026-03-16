/**
 * @file MemoryEventDeduplicator.ts
 * @description 記憶體事件去重實現
 *
 * 用於測試和開發環境的簡單實現。
 * 使用 Set 儲存已處理的 eventId。
 *
 * **特性**：
 * - O(1) 查詢和插入性能
 * - 完全在記憶體中，適合單進程環境
 * - 無外部依賴
 *
 * **限制**：
 * - 應用重啟後記錄丟失
 * - 不適合分散式環境
 * - 生產環境應使用 Redis 或資料庫支持版本
 *
 * @public
 */

import type { IEventDeduplicator } from '../../Application/Ports/IEventDeduplicator'

export class MemoryEventDeduplicator implements IEventDeduplicator {
  /** 已處理事件 ID 的集合 */
  private readonly processedEventIds: Set<string> = new Set()

  /**
   * 標記事件為已處理
   *
   * @param eventId - 事件唯一識別碼
   */
  async markProcessed(eventId: string): Promise<void> {
    this.processedEventIds.add(eventId)
  }

  /**
   * 檢查事件是否已被處理
   *
   * @param eventId - 事件唯一識別碼
   * @returns 若事件已處理返回 true
   */
  async isProcessed(eventId: string): Promise<boolean> {
    return this.processedEventIds.has(eventId)
  }

  /**
   * 清除特定事件的處理記錄
   *
   * @param eventId - 事件唯一識別碼
   * @returns 成功清除返回 true
   */
  async remove(eventId: string): Promise<boolean> {
    return this.processedEventIds.delete(eventId)
  }

  /**
   * 清除所有處理記錄
   */
  async clear(): Promise<void> {
    this.processedEventIds.clear()
  }

  /**
   * 取得已處理事件總數
   *
   * @returns 已處理的事件數量
   */
  async getProcessedCount(): Promise<number> {
    return this.processedEventIds.size
  }

  /**
   * 列出所有已處理的事件 ID
   *
   * @returns 已處理事件 ID 的陣列
   */
  async listProcessedEventIds(): Promise<string[]> {
    return Array.from(this.processedEventIds)
  }
}
