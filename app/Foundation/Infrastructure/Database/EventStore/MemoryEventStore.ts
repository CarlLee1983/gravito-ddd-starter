import type { IEventStore, StoredEvent } from '../../Ports/Database/IEventStore'
import { EventStoreVersionConflictException } from '@/Foundation/Application/EventStoreVersionConflictException'

/**
 * 記憶體事件存儲實現
 *
 * 用於測試和開發環境的簡單實現。
 * 支援樂觀鎖版本控制，防止併發寫入衝突。
 *
 * **特性**:
 * - 版本檢查：確保按順序附加事件
 * - 原子操作：Map 操作在 JS 中天然是原子的
 * - 簡單可靠：零依賴，適合單進程環境
 */
export class MemoryEventStore implements IEventStore {
  private readonly events: Map<string, StoredEvent[]> = new Map()

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
}
