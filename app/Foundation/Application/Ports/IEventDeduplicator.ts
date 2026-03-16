/**
 * @file IEventDeduplicator.ts
 * @description 事件去重介面 (Port)
 *
 * 防止重複事件處理：
 * - 相同 eventId 的事件只被處理一次
 * - 支援分佈式去重（通過相同鍵識別重複）
 * - 支援清理已處理事件記錄
 *
 * **使用場景**：
 * - 事件重試時去重
 * - 跨網絡傳輸導致的重複
 * - Saga 補償時的冪等性
 *
 * **設計模式**：
 * - IEventDeduplicator 由 Application 層定義（Port）
 * - MemoryEventDeduplicator 在 Infrastructure 層實現（Adapter）
 * - 容器注入到 IEventDispatcher 實現類
 *
 * @public
 */

export interface IEventDeduplicator {
  /**
   * 標記事件為已處理
   * 記錄事件的 eventId，表示已處理過此事件
   *
   * @param eventId - 事件唯一識別碼（UUID）
   * @throws 記錄失敗時拋出異常
   */
  markProcessed(eventId: string): Promise<void>

  /**
   * 檢查事件是否已被處理
   * 若事件 eventId 已存在於處理記錄中，表示重複事件
   *
   * @param eventId - 事件唯一識別碼
   * @returns 若事件已處理返回 true，未處理返回 false
   */
  isProcessed(eventId: string): Promise<boolean>

  /**
   * 清除特定事件的處理記錄
   * 用於錯誤恢復或管理目的
   *
   * @param eventId - 事件唯一識別碼
   * @returns 成功清除返回 true，記錄不存在返回 false
   */
  remove(eventId: string): Promise<boolean>

  /**
   * 清除所有處理記錄
   * 用於測試或重新同步
   *
   * @throws 清除失敗時拋出異常
   */
  clear(): Promise<void>

  /**
   * 取得已處理事件總數
   * 用於監控和統計
   *
   * @returns 已處理的事件數量
   */
  getProcessedCount(): Promise<number>

  /**
   * 列出所有已處理的事件 ID
   * 用於調試和審計
   *
   * @returns 已處理事件 ID 的陣列
   */
  listProcessedEventIds(): Promise<string[]>
}

/**
 * 事件去重結果
 * 表示事件是否應該被處理
 *
 * @public
 */
export interface DeduplicationResult {
  /** 事件是否已處理過（重複） */
  readonly isDuplicate: boolean

  /** 事件唯一識別碼 */
  readonly eventId: string

  /** 處理決策（允許或拒絕） */
  readonly decision: 'allow' | 'reject'
}
