/**
 * @file EventStoreSnapshot.test.ts
 * @description Event Store 快照功能測試
 *
 * 驗證以下功能：
 * - 快照保存和載入
 * - 版本相關的快照檢索
 * - 舊快照清理
 * - 快照恢復流程
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventStore } from '@/Foundation/Infrastructure/Database/EventStore/MemoryEventStore'
import type { EventStoreSnapshotData } from '@/Foundation/Infrastructure/Ports/Database/EventStoreSnapshot'

describe('Event Store Snapshots', () => {
  let eventStore: MemoryEventStore
  let snapshotId: string = ''

  beforeEach(() => {
    eventStore = new MemoryEventStore()
  })

  describe('Snapshot Save and Load', () => {
    it('應該保存快照並載入最新快照', async () => {
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 10,
        aggregateState: JSON.stringify({ id: 'user-1', name: 'Alice', email: 'alice@example.com' }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)
      const loaded = await eventStore.loadLatestSnapshot('user-1')

      expect(loaded).toBeDefined()
      expect(loaded?.id).toBe('snap-1')
      expect(loaded?.snapshotVersion).toBe(10)
      expect(loaded?.aggregateType).toBe('User')
    })

    it('應該返回 null 當沒有快照時', async () => {
      const loaded = await eventStore.loadLatestSnapshot('user-nonexistent')
      expect(loaded).toBeNull()
    })

    it('應該保存多個快照並返回最新的', async () => {
      const snapshot1: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ name: 'Alice' }),
        snapshotAt: new Date().toISOString(),
      }

      const snapshot2: EventStoreSnapshotData = {
        id: 'snap-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 10,
        aggregateState: JSON.stringify({ name: 'Alice Updated' }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot1)
      await eventStore.saveSnapshot(snapshot2)

      const latest = await eventStore.loadLatestSnapshot('user-1')
      expect(latest?.snapshotVersion).toBe(10)
      expect(latest?.id).toBe('snap-2')
    })
  })

  describe('Snapshot Retrieval by Version', () => {
    it('應該載入特定版本的快照', async () => {
      const snapshot1: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ version: 5 }),
        snapshotAt: new Date().toISOString(),
      }

      const snapshot2: EventStoreSnapshotData = {
        id: 'snap-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 10,
        aggregateState: JSON.stringify({ version: 10 }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot1)
      await eventStore.saveSnapshot(snapshot2)

      const snap5 = await eventStore.loadSnapshotAtVersion('user-1', 5)
      const snap10 = await eventStore.loadSnapshotAtVersion('user-1', 10)

      expect(snap5?.snapshotVersion).toBe(5)
      expect(snap10?.snapshotVersion).toBe(10)
    })

    it('應該返回 null 當版本不存在時', async () => {
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ version: 5 }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)
      const snap = await eventStore.loadSnapshotAtVersion('user-1', 99)

      expect(snap).toBeNull()
    })
  })

  describe('List Snapshots', () => {
    it('應該列出所有快照按版本升序', async () => {
      const snapshots = [
        {
          id: 'snap-1',
          aggregateId: 'user-1',
          aggregateType: 'User',
          snapshotVersion: 10,
          aggregateState: JSON.stringify({}),
          snapshotAt: new Date().toISOString(),
        },
        {
          id: 'snap-2',
          aggregateId: 'user-1',
          aggregateType: 'User',
          snapshotVersion: 5,
          aggregateState: JSON.stringify({}),
          snapshotAt: new Date().toISOString(),
        },
        {
          id: 'snap-3',
          aggregateId: 'user-1',
          aggregateType: 'User',
          snapshotVersion: 15,
          aggregateState: JSON.stringify({}),
          snapshotAt: new Date().toISOString(),
        },
      ]

      for (const snap of snapshots) {
        await eventStore.saveSnapshot(snap)
      }

      const listed = await eventStore.listSnapshots('user-1')

      expect(listed.length).toBe(3)
      expect(listed[0]?.snapshotVersion).toBe(5)
      expect(listed[1]?.snapshotVersion).toBe(10)
      expect(listed[2]?.snapshotVersion).toBe(15)
    })

    it('應該返回空陣列當沒有快照時', async () => {
      const listed = await eventStore.listSnapshots('user-nonexistent')
      expect(listed.length).toBe(0)
    })

    it('應該不影響原始快照列表', async () => {
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)
      const listed1 = await eventStore.listSnapshots('user-1')
      const listed2 = await eventStore.listSnapshots('user-1')

      expect(listed1.length).toBe(1)
      expect(listed2.length).toBe(1)
      // 修改返回的列表不應影響內部狀態
      listed1.push(snapshot)
      const listed3 = await eventStore.listSnapshots('user-1')
      expect(listed3.length).toBe(1)
    })
  })

  describe('Delete Snapshots', () => {
    it('應該刪除快照', async () => {
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)
      const beforeDelete = await eventStore.listSnapshots('user-1')
      expect(beforeDelete.length).toBe(1)

      await eventStore.deleteSnapshot('snap-1')
      const afterDelete = await eventStore.listSnapshots('user-1')
      expect(afterDelete.length).toBe(0)
    })

    it('應該只刪除指定 ID 的快照', async () => {
      const snap1: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }

      const snap2: EventStoreSnapshotData = {
        id: 'snap-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 10,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snap1)
      await eventStore.saveSnapshot(snap2)

      await eventStore.deleteSnapshot('snap-1')
      const remaining = await eventStore.listSnapshots('user-1')

      expect(remaining.length).toBe(1)
      expect(remaining[0]?.id).toBe('snap-2')
    })

    it('應該安全地刪除不存在的快照 ID', async () => {
      const snapshot: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snapshot)
      await eventStore.deleteSnapshot('snap-nonexistent') // 不應拋出異常

      const remaining = await eventStore.listSnapshots('user-1')
      expect(remaining.length).toBe(1) // 原快照應保留
    })
  })

  describe('Cleanup Old Snapshots', () => {
    it('應該保留最新 N 個快照並刪除舊快照', async () => {
      const snapshots = [1, 2, 3, 4, 5].map((version) => ({
        id: `snap-${version}`,
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: version,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }))

      for (const snap of snapshots) {
        await eventStore.saveSnapshot(snap)
      }

      await eventStore.cleanupOldSnapshots('user-1', 2)
      const remaining = await eventStore.listSnapshots('user-1')

      expect(remaining.length).toBe(2)
      expect(remaining[0]?.snapshotVersion).toBe(4)
      expect(remaining[1]?.snapshotVersion).toBe(5)
    })

    it('應該使用默認 keepCount 為 3', async () => {
      const snapshots = [1, 2, 3, 4, 5].map((version) => ({
        id: `snap-${version}`,
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: version,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }))

      for (const snap of snapshots) {
        await eventStore.saveSnapshot(snap)
      }

      await eventStore.cleanupOldSnapshots('user-1') // 不指定 keepCount，默認 3
      const remaining = await eventStore.listSnapshots('user-1')

      expect(remaining.length).toBe(3)
      expect(remaining[0]?.snapshotVersion).toBe(3)
      expect(remaining[1]?.snapshotVersion).toBe(4)
      expect(remaining[2]?.snapshotVersion).toBe(5)
    })

    it('應該在快照少於 keepCount 時不做任何操作', async () => {
      const snapshots = [1, 2].map((version) => ({
        id: `snap-${version}`,
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: version,
        aggregateState: JSON.stringify({}),
        snapshotAt: new Date().toISOString(),
      }))

      for (const snap of snapshots) {
        await eventStore.saveSnapshot(snap)
      }

      await eventStore.cleanupOldSnapshots('user-1', 3)
      const remaining = await eventStore.listSnapshots('user-1')

      expect(remaining.length).toBe(2)
    })
  })

  describe('Snapshot Isolation Across Aggregates', () => {
    it('應該隔離不同聚合根的快照', async () => {
      const snap1: EventStoreSnapshotData = {
        id: 'snap-user-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ name: 'Alice' }),
        snapshotAt: new Date().toISOString(),
      }

      const snap2: EventStoreSnapshotData = {
        id: 'snap-user-2',
        aggregateId: 'user-2',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ name: 'Bob' }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snap1)
      await eventStore.saveSnapshot(snap2)

      const user1Snaps = await eventStore.listSnapshots('user-1')
      const user2Snaps = await eventStore.listSnapshots('user-2')

      expect(user1Snaps.length).toBe(1)
      expect(user2Snaps.length).toBe(1)
      expect(user1Snaps[0]?.id).toBe('snap-user-1')
      expect(user2Snaps[0]?.id).toBe('snap-user-2')
    })
  })

  describe('Snapshot Update (Replace)', () => {
    it('應該替換相同版本的快照', async () => {
      const snap1: EventStoreSnapshotData = {
        id: 'snap-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5,
        aggregateState: JSON.stringify({ name: 'Alice' }),
        snapshotAt: new Date().toISOString(),
      }

      const snap2: EventStoreSnapshotData = {
        id: 'snap-1-updated',
        aggregateId: 'user-1',
        aggregateType: 'User',
        snapshotVersion: 5, // 相同版本
        aggregateState: JSON.stringify({ name: 'Alice Updated' }),
        snapshotAt: new Date().toISOString(),
      }

      await eventStore.saveSnapshot(snap1)
      const before = await eventStore.listSnapshots('user-1')
      expect(before.length).toBe(1)

      await eventStore.saveSnapshot(snap2)
      const after = await eventStore.listSnapshots('user-1')
      expect(after.length).toBe(1)
      expect(after[0]?.id).toBe('snap-1-updated') // ID 應更新
      expect(after[0]?.aggregateState).toContain('Alice Updated')
    })
  })
})
