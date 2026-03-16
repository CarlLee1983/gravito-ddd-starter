/**
 * @file EventStoreSnapshot.ts
 * @description Event Store 快照定義
 *
 * 快照是聚合根在特定事件版本的完整狀態，用於性能優化：
 * - 避免每次都從第一個事件開始重新應用
 * - 加速聚合根的重構過程
 * - 特別適合有大量事件歷史的聚合根
 *
 * **使用場景**：
 * - 長時間運行的聚合根（數千個事件）
 * - 需要快速載入的熱點數據
 * - 事件溯源系統的性能瓶頸
 *
 * **快照策略**（可選）：
 * - 版本倍數快照：每 10 個事件生成一次快照
 * - 時間間隔快照：每小時生成一次快照
 * - 手動快照：在特定業務里程碑生成快照
 */

/**
 * Event Store 快照介面
 *
 * 儲存聚合根在特定版本的完整狀態
 *
 * @public
 */
export interface EventStoreSnapshotData {
  /** 快照唯一識別符 */
  readonly id: string

  /** 聚合根 ID */
  readonly aggregateId: string

  /** 聚合根類型（如 'User', 'Post'） */
  readonly aggregateType: string

  /** 快照時對應的事件版本號（最後包含的事件版本） */
  readonly snapshotVersion: number

  /** 聚合根的快照狀態（JSON 序列化） */
  readonly aggregateState: string

  /** 快照建立時間（ISO 8601） */
  readonly snapshotAt: string

  /** 選用：快照備註（如生成原因、策略） */
  readonly metadata?: string
}

/**
 * Event Store Snapshot 操作介面
 *
 * 擴展 IEventStore，提供快照的生成、儲存、載入功能
 *
 * @public
 */
export interface IEventStoreSnapshot {
  /**
   * 保存快照
   *
   * @param snapshot - 快照數據
   * @throws 儲存失敗時拋出異常
   */
  saveSnapshot(snapshot: EventStoreSnapshotData): Promise<void>

  /**
   * 載入最新快照
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含快照數據或 null（若無快照）
   */
  loadLatestSnapshot(aggregateId: string): Promise<EventStoreSnapshotData | null>

  /**
   * 載入特定版本的快照
   *
   * @param aggregateId - 聚合根 ID
   * @param version - 快照版本
   * @returns Promise 包含快照數據或 null
   */
  loadSnapshotAtVersion(aggregateId: string, version: number): Promise<EventStoreSnapshotData | null>

  /**
   * 列出聚合根的所有快照
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含該聚合根的所有快照（按版本升序）
   */
  listSnapshots(aggregateId: string): Promise<EventStoreSnapshotData[]>

  /**
   * 刪除快照
   *
   * @param snapshotId - 快照 ID
   * @throws 刪除失敗時拋出異常
   */
  deleteSnapshot(snapshotId: string): Promise<void>

  /**
   * 刪除聚合根的所有舊快照（保留最新 N 個）
   *
   * @param aggregateId - 聚合根 ID
   * @param keepCount - 保留的最新快照個數（默認 3）
   */
  cleanupOldSnapshots(aggregateId: string, keepCount?: number): Promise<void>
}

/**
 * 快照策略選項
 *
 * @public
 */
export interface SnapshotStrategyOptions {
  /** 快照生成間隔（事件版本倍數）。如 10 表示每 10 個事件生成一次 */
  intervalVersion?: number

  /** 快照生成間隔（毫秒）。如 3600000 表示每小時生成一次 */
  intervalTime?: number

  /** 保留的最新快照個數 */
  keepSnapshotCount?: number

  /** 快照生成時的聚合根狀態序列化函數 */
  serializeState?: (aggregate: any) => string

  /** 快照恢復時的狀態反序列化函數 */
  deserializeState?: (json: string) => any
}

/**
 * 快照恢復結果
 *
 * @public
 */
export interface SnapshotRecoveryResult<T> {
  /** 從快照恢復的聚合根 */
  aggregate: T

  /** 從哪個版本之後需要應用事件（快照版本號 + 1） */
  fromEventVersion: number

  /** 快照是否找到 */
  snapshotFound: boolean

  /** 快照生成時間 */
  snapshotAt?: string
}
