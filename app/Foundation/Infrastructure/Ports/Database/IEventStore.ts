export interface StoredEvent {
  readonly id: string              // 內部主鍵 UUID
  readonly eventId: string         // DomainEvent.eventId
  readonly aggregateId: string
  readonly aggregateType: string   // 'User' | 'Post' | 'HealthCheck'
  readonly eventType: string
  readonly eventData: string       // JSON.stringify(event.toJSON())
  readonly eventVersion: number    // DomainEvent.version（Schema 版本）
  readonly aggregateVersion: number // 事件序號（遞增）
  readonly occurredAt: string      // ISO 8601
}

export interface IEventStore {
  /**
   * 附加事件到事件存儲（支援樂觀鎖）
   *
   * @param events - 要附加的事件陣列
   * @param aggregateId - 聚合根 ID（用於版本檢查）
   * @param expectedVersion - 預期的聚合版本（用於樂觀鎖檢查）
   * @throws EventStoreVersionConflictException - 版本不匹配時拋出
   */
  append(events: StoredEvent[], aggregateId?: string, expectedVersion?: number): Promise<void>

  /**
   * 取得聚合根的目前事件版本（最後一個事件的版本）
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含聚合版本（0 表示未發現任何事件）
   */
  getCurrentVersion(aggregateId: string): Promise<number>

  /**
   * 根據聚合根 ID 載入事件
   *
   * @param aggregateId - 聚合根 ID
   * @param aggregateType - 聚合根型別（選用，用於篩選）
   * @param fromVersion - 從指定版本開始載入（選用）
   * @returns Promise 包含符合條件的事件陣列
   */
  loadByAggregateId(aggregateId: string, aggregateType?: string, fromVersion?: number): Promise<StoredEvent[]>

  /**
   * 根據事件型別載入事件
   *
   * @param eventType - 事件型別
   * @returns Promise 包含所有該型別的事件
   */
  loadByEventType(eventType: string): Promise<StoredEvent[]>

  /**
   * 計算聚合根的事件總數
   *
   * @param aggregateId - 聚合根 ID
   * @returns Promise 包含事件總數
   */
  countByAggregateId(aggregateId: string): Promise<number>
}
