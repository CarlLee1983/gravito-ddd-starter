import type { IEventStore, StoredEvent } from '../../Ports/Database/IEventStore'
import type { IEventStoreSnapshot, EventStoreSnapshotData } from '../../Ports/Database/EventStoreSnapshot'
import { EventStoreVersionConflictException } from '@/Foundation/Application/EventStoreVersionConflictException'
import { v4 as uuidv4 } from 'uuid'

/**
 * 記憶體事件存儲實現
 *
 * 用於測試和開發環境的簡單實現。
 * 支援樂觀鎖版本控制，防止併發寫入衝突。
 * 支援快照機制，加速聚合根重構。
 *
 * **特性**:
 * - 版本檢查：確保按順序附加事件
 * - 原子操作：Map 操作在 JS 中天然是原子的
 * - 快照存儲：支援保存、載入、清理快照
 * - 簡單可靠：零依賴，適合單進程環境
 */
export class MemoryEventStore implements IEventStore, IEventStoreSnapshot {
  private readonly events: Map<string, StoredEvent[]> = new Map()
  private readonly snapshots: Map<string, EventStoreSnapshotData[]> = new Map()

  /**
   * 附加事件到事件存儲（支援樂觀鎖）
   *
   * @param events - 要附加的事件陣列
   * @param aggregateId - 聚合根 ID（用於版本檢查）
   * @param expectedVersion - 預期的聚合版本（用於樂觀鎖檢查）
   * @throws EventStoreVersionConflictException - 版本不匹配時拋出
   */
  async append(events: StoredEvent[], aggregateId?: string, expectedVersion?: number): Promise<void> {
    // 如果指定了 aggregateId 和 expectedVersion，進行樂觀鎖檢查
    if (aggregateId !== undefined && expectedVersion !== undefined) {
      const currentVersion = await this.getCurrentVersion(aggregateId)
      if (currentVersion !== expectedVersion) {
        throw new EventStoreVersionConflictException(aggregateId, expectedVersion, currentVersion)
      }
    }

    // 附加所有事件
    for (const event of events) {
      const key = event.aggregateId
      if (!this.events.has(key)) {
        this.events.set(key, [])
      }
      this.events.get(key)!.push(event)
    }
  }

  /**
   * 取得聚合根的目前事件版本（最後一個事件的版本）
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含聚合版本（0 表示未發現任何事件）
   */
  async getCurrentVersion(aggregateId: string): Promise<number> {
    const events = this.events.get(aggregateId) || []
    if (events.length === 0) {
      return 0
    }
    // 返回最後一個事件的 aggregateVersion
    return events[events.length - 1]!.aggregateVersion
  }

  /**
   * 根據聚合根 ID 載入事件
   *
   * @param aggregateId - 聚合根 ID
   * @param aggregateType - 聚合根型別（選用，用於篩選）
   * @param fromVersion - 從指定版本開始載入（選用）
   * @returns Promise 包含符合條件的事件陣列
   */
  async loadByAggregateId(
    aggregateId: string,
    aggregateType?: string,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    const events = this.events.get(aggregateId) || []

    return events.filter((event) => {
      if (aggregateType && event.aggregateType !== aggregateType) {
        return false
      }
      if (fromVersion !== undefined && event.aggregateVersion < fromVersion) {
        return false
      }
      return true
    })
  }

  /**
   * 根據事件型別載入事件
   *
   * @param eventType - 事件型別
   * @returns Promise 包含所有該型別的事件
   */
  async loadByEventType(eventType: string): Promise<StoredEvent[]> {
    const result: StoredEvent[] = []
    for (const events of this.events.values()) {
      result.push(...events.filter((e) => e.eventType === eventType))
    }
    return result
  }

  /**
   * 計算聚合根的事件總數
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含事件總數
   */
  async countByAggregateId(aggregateId: string): Promise<number> {
    const events = this.events.get(aggregateId) || []
    return events.length
  }

  /**
   * 保存快照
   *
   * @param snapshot - 快照數據
   */
  async saveSnapshot(snapshot: EventStoreSnapshotData): Promise<void> {
    const aggregateId = snapshot.aggregateId
    if (!this.snapshots.has(aggregateId)) {
      this.snapshots.set(aggregateId, [])
    }

    const aggregateSnapshots = this.snapshots.get(aggregateId)!
    // 檢查是否已存在相同版本的快照，若有則替換
    const existingIndex = aggregateSnapshots.findIndex(
      (s) => s.snapshotVersion === snapshot.snapshotVersion
    )
    if (existingIndex >= 0) {
      aggregateSnapshots[existingIndex] = snapshot
    } else {
      aggregateSnapshots.push(snapshot)
      // 保持版本升序
      aggregateSnapshots.sort((a, b) => a.snapshotVersion - b.snapshotVersion)
    }
  }

  /**
   * 載入最新快照
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含快照數據或 null（若無快照）
   */
  async loadLatestSnapshot(aggregateId: string): Promise<EventStoreSnapshotData | null> {
    const aggregateSnapshots = this.snapshots.get(aggregateId) || []
    if (aggregateSnapshots.length === 0) {
      return null
    }
    return aggregateSnapshots[aggregateSnapshots.length - 1]!
  }

  /**
   * 載入特定版本的快照
   *
   * @param aggregateId - 聚合根 ID
   * @param version - 快照版本
   * @returns Promise 包含快照數據或 null
   */
  async loadSnapshotAtVersion(
    aggregateId: string,
    version: number
  ): Promise<EventStoreSnapshotData | null> {
    const aggregateSnapshots = this.snapshots.get(aggregateId) || []
    const snapshot = aggregateSnapshots.find((s) => s.snapshotVersion === version)
    return snapshot || null
  }

  /**
   * 列出聚合根的所有快照
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含該聚合根的所有快照（按版本升序）
   */
  async listSnapshots(aggregateId: string): Promise<EventStoreSnapshotData[]> {
    const aggregateSnapshots = this.snapshots.get(aggregateId) || []
    return [...aggregateSnapshots] // 返回副本以防止外部修改
  }

  /**
   * 刪除快照
   *
   * @param snapshotId - 快照 ID
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    // 遍歷所有聚合根的快照，尋找並刪除指定 ID 的快照
    for (const [, snapshots] of this.snapshots.entries()) {
      const index = snapshots.findIndex((s) => s.id === snapshotId)
      if (index >= 0) {
        snapshots.splice(index, 1)
        break
      }
    }
  }

  /**
   * 刪除聚合根的所有舊快照（保留最新 N 個）
   *
   * @param aggregateId - 聚合根 ID
   * @param keepCount - 保留的最新快照個數（默認 3）
   */
  async cleanupOldSnapshots(aggregateId: string, keepCount: number = 3): Promise<void> {
    const aggregateSnapshots = this.snapshots.get(aggregateId) || []
    if (aggregateSnapshots.length > keepCount) {
      // 移除最舊的快照，保留最新的 N 個
      const toRemove = aggregateSnapshots.length - keepCount
      aggregateSnapshots.splice(0, toRemove)
    }
  }
}
