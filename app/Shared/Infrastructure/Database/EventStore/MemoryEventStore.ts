import type { IEventStore, StoredEvent } from '../../IEventStore'

export class MemoryEventStore implements IEventStore {
  private readonly events: Map<string, StoredEvent[]> = new Map()

  async append(events: StoredEvent[]): Promise<void> {
    for (const event of events) {
      const key = event.aggregateId
      if (!this.events.has(key)) {
        this.events.set(key, [])
      }
      this.events.get(key)!.push(event)
    }
  }

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

  async loadByEventType(eventType: string): Promise<StoredEvent[]> {
    const result: StoredEvent[] = []
    for (const events of this.events.values()) {
      result.push(...events.filter((e) => e.eventType === eventType))
    }
    return result
  }

  async countByAggregateId(aggregateId: string): Promise<number> {
    const events = this.events.get(aggregateId) || []
    return events.length
  }
}
