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
  append(events: StoredEvent[]): Promise<void>
  loadByAggregateId(aggregateId: string, aggregateType?: string, fromVersion?: number): Promise<StoredEvent[]>
  loadByEventType(eventType: string): Promise<StoredEvent[]>
  countByAggregateId(aggregateId: string): Promise<number>
}
