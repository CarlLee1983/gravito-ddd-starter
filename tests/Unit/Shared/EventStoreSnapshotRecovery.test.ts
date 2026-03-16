/**
 * @file EventStoreSnapshotRecovery.test.ts
 * @description 快照恢復流程測試
 *
 * 驗證快照如何加速聚合根重構：
 * - 從快照恢復初始狀態
 * - 只載入快照之後的增量事件
 * - 性能對比（有快照 vs 無快照）
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventStore } from '@/Foundation/Infrastructure/Database/EventStore/MemoryEventStore'
import type { StoredEvent } from '@/Foundation/Infrastructure/Ports/Database/IEventStore'
import type { EventStoreSnapshotData } from '@/Foundation/Infrastructure/Ports/Database/EventStoreSnapshot'

describe('Event Store Snapshot Recovery', () => {
  let eventStore: MemoryEventStore

  beforeEach(() => {
    eventStore = new MemoryEventStore()
  })

  describe('Snapshot-based Aggregate Reconstruction', () => {
    it('應該從快照恢復並載入增量事件', async () => {
      const aggregateId = 'user-1'

      // 1. 建立初始事件鏈（模擬 100 個事件）
      const events: StoredEvent[] = Array.from({ length: 100 }, (_, i) => ({
        id: `evt-${i + 1}`,
        aggregateId,
        aggregateType: 'User',
        aggregateVersion: i + 1,
        eventType: 'UserPropertyUpdated',
        eventData: JSON.stringify({ field: 'name', value: `User_v${i + 1}` }),
        occurredAt: new Date().toISOString(),
      }))

      // 2. 附加所有事件
      await eventStore.append(events, aggregateId, 0)

      // 3. 在版本 50 建立快照（模擬只需重新應用 50 個事件的狀態）
      const snapshotData: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId,
        aggregateType: 'User',
        snapshotVersion: 50,
        aggregateState: JSON.stringify({
          id: aggregateId,
          name: 'User_v50',
          version: 50,
        }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshotData)

      // 4. 模擬恢復流程：
      // a) 載入最新快照
      const snapshot = await eventStore.loadLatestSnapshot(aggregateId)
      expect(snapshot).toBeDefined()
      expect(snapshot?.snapshotVersion).toBe(50)

      // b) 只載入快照之後的事件（版本 > 50）
      const deltaEvents = await eventStore.loadByAggregateId(aggregateId, 'User', 51)
      expect(deltaEvents.length).toBe(50) // 應只有版本 51-100 的事件

      // 5. 驗證增量事件的版本範圍正確
      expect(deltaEvents[0]?.aggregateVersion).toBe(51)
      expect(deltaEvents[deltaEvents.length - 1]?.aggregateVersion).toBe(100)
    })

    it('應該優先使用最新的快照', async () => {
      const aggregateId = 'user-1'

      // 建立多個快照
      const snapshots = [1, 2, 3].map((version) => ({
        id: `snap-${version}`,
        aggregateId,
        aggregateType: 'User',
        snapshotVersion: version * 10,
        aggregateState: JSON.stringify({ version: version * 10 }),
        snapshotAt: new Date().toISOString(),
      }))

      for (const snap of snapshots) {
        await eventStore.saveSnapshot(snap)
      }

      // 應該返回最新的快照（版本 30）
      const latest = await eventStore.loadLatestSnapshot(aggregateId)
      expect(latest?.snapshotVersion).toBe(30)

      // 可以明確載入特定版本的快照
      const snap2 = await eventStore.loadSnapshotAtVersion(aggregateId, 20)
      expect(snap2?.snapshotVersion).toBe(20)
    })
  })

  describe('Delta Event Loading After Snapshot', () => {
    it('應該只載入快照版本之後的事件', async () => {
      const aggregateId = 'order-1'

      // 建立 10 個事件
      const events = Array.from({ length: 10 }, (_, i) => ({
        id: `evt-${i + 1}`,
        aggregateId,
        aggregateType: 'Order',
        aggregateVersion: i + 1,
        eventType: 'OrderStatusChanged',
        eventData: JSON.stringify({ status: `state_${i + 1}` }),
        occurredAt: new Date().toISOString(),
      }))

      await eventStore.append(events, aggregateId, 0)

      // 建立版本 5 的快照
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId,
        aggregateType: 'Order',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ status: 'state_5' }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)

      // 載入快照後的事件（只需應用版本 6-10）
      const deltaEvents = await eventStore.loadByAggregateId(aggregateId, 'Order', 6)

      expect(deltaEvents.length).toBe(5)
      expect(deltaEvents[0]?.aggregateVersion).toBe(6)
      expect(deltaEvents[4]?.aggregateVersion).toBe(10)
    })

    it('應該在沒有快照時正常載入所有事件', async () => {
      const aggregateId = 'product-1'

      const events = Array.from({ length: 5 }, (_, i) => ({
        id: `evt-${i + 1}`,
        aggregateId,
        aggregateType: 'Product',
        aggregateVersion: i + 1,
        eventType: 'ProductUpdated',
        eventData: JSON.stringify({}),
        occurredAt: new Date().toISOString(),
      }))

      await eventStore.append(events, aggregateId, 0)

      // 沒有快照的情況下，應從版本 1 開始載入
      const allEvents = await eventStore.loadByAggregateId(aggregateId)
      expect(allEvents.length).toBe(5)
    })
  })

  describe('Performance Optimization Scenario', () => {
    it('應該實現快照的性能優化（模擬）', async () => {
      const aggregateId = 'user-1'

      // 建立 1000 個事件（模擬長時間運行的聚合根）
      const eventCount = 1000
      const events: StoredEvent[] = Array.from({ length: eventCount }, (_, i) => ({
        id: `evt-${i + 1}`,
        aggregateId,
        aggregateType: 'User',
        aggregateVersion: i + 1,
        eventType: 'UserPropertyUpdated',
        eventData: JSON.stringify({ field: 'update', index: i }),
        occurredAt: new Date().toISOString(),
      }))

      await eventStore.append(events, aggregateId, 0)

      // 在版本 900 建立快照
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId,
        aggregateType: 'User',
        snapshotVersion: 900,
        aggregateState: JSON.stringify({ version: 900, state: 'complete' }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)

      // 恢復時只需載入 100 個事件（版本 901-1000），而不是全部 1000 個
      const deltaEvents = await eventStore.loadByAggregateId(aggregateId, 'User', 901)
      const allEvents = await eventStore.loadByAggregateId(aggregateId)

      // 驗證性能優化效果
      expect(deltaEvents.length).toBe(100) // 減少 90% 的事件載入
      expect(allEvents.length).toBe(1000) // 原始事件仍保留
      expect(deltaEvents.length / allEvents.length).toBeLessThan(0.11) // 減少超過 90%
    })
  })

  describe('Snapshot Metadata and Recovery Info', () => {
    it('應該在快照中記錄重要的恢復資訊', async () => {
      const aggregateId = 'cart-1'

      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId,
        aggregateType: 'Cart',
        snapshotVersion: 42,
        aggregateState: JSON.stringify({
          id: aggregateId,
          items: [],
          total: 0,
        }),
        snapshotAt: new Date().toISOString(),
        metadata: 'created_by_version_interval_strategy', // 記錄生成方法
      }

      await eventStore.saveSnapshot(snapshot)
      const loaded = await eventStore.loadLatestSnapshot(aggregateId)

      expect(loaded?.metadata).toBe('created_by_version_interval_strategy')
      expect(loaded?.snapshotAt).toBeDefined()
      // 從快照恢復需要應用版本 43 之後的事件
      const nextVersion = (loaded?.snapshotVersion ?? 0) + 1
      expect(nextVersion).toBe(43)
    })
  })

  describe('Multi-Aggregate Snapshot Management', () => {
    it('應該獨立管理多個聚合根的快照', async () => {
      // 為不同聚合根建立快照
      for (let i = 1; i <= 3; i++) {
        const aggregateId = `order-${i}`
        const events = Array.from({ length: 20 }, (_, j) => ({
          id: `evt-${i}-${j + 1}`,
          aggregateId,
          aggregateType: 'Order',
          aggregateVersion: j + 1,
          eventType: 'OrderCreated',
          eventData: JSON.stringify({ orderId: aggregateId }),
          occurredAt: new Date().toISOString(),
        }))

        await eventStore.append(events, aggregateId, 0)

        // 為每個聚合根建立快照
        const snapshot: EventStoreSnapshotData = {
          id: `snap-${i}`,
          aggregateId,
          aggregateType: 'Order',
          snapshotVersion: 10,
          aggregateState: JSON.stringify({ version: 10 }),
          snapshotAt: new Date().toISOString(),
        }

        await eventStore.saveSnapshot(snapshot)
      }

      // 驗證每個聚合根都有獨立的快照
      for (let i = 1; i <= 3; i++) {
        const snap = await eventStore.loadLatestSnapshot(`order-${i}`)
        expect(snap?.id).toBe(`snap-${i}`)
        expect(snap?.aggregateId).toBe(`order-${i}`)
      }
    })
  })
})
