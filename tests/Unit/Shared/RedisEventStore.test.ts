import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IRedisService } from '@/Shared/Infrastructure/Ports/Messaging/IRedisService'
import type { StoredEvent } from '@/Shared/Infrastructure/Ports/Database/IEventStore'
import { RedisEventStore } from '@/Shared/Infrastructure/Database/EventStore/RedisEventStore'

/**
 * RedisEventStore 單元測試
 */
describe('RedisEventStore', () => {
	let eventStore: RedisEventStore
	let mockRedis: any

	beforeEach(() => {
		// 建立 Mock Redis 服務
		mockRedis = {
			rpush: vi.fn().mockResolvedValue(1),
			lrange: vi.fn().mockResolvedValue([]),
			llen: vi.fn().mockResolvedValue(0),
		}

		eventStore = new RedisEventStore(mockRedis as IRedisService)
	})

	describe('append', () => {
		it('應該將事件寫入聚合根索引和事件型別索引', async () => {
			const event: StoredEvent = {
				id: '1',
				eventId: 'evt-1',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			await eventStore.append([event])

			expect(mockRedis.rpush).toHaveBeenCalledTimes(2)
			expect(mockRedis.rpush).toHaveBeenNthCalledWith(
				1,
				'eventstore:agg:agg-1',
				JSON.stringify(event)
			)
			expect(mockRedis.rpush).toHaveBeenNthCalledWith(
				2,
				'eventstore:type:UserCreated',
				JSON.stringify(event)
			)
		})

		it('應該處理多個事件', async () => {
			const event1: StoredEvent = {
				id: '1',
				eventId: 'evt-1',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			const event2: StoredEvent = {
				id: '2',
				eventId: 'evt-2',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserUpdated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 2,
				occurredAt: new Date().toISOString(),
			}

			await eventStore.append([event1, event2])

			expect(mockRedis.rpush).toHaveBeenCalledTimes(4)
		})
	})

	describe('loadByAggregateId', () => {
		it('應該載入聚合根的所有事件', async () => {
			const event1: StoredEvent = {
				id: '1',
				eventId: 'evt-1',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			const event2: StoredEvent = {
				id: '2',
				eventId: 'evt-2',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserUpdated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 2,
				occurredAt: new Date().toISOString(),
			}

			mockRedis.lrange.mockResolvedValue([
				JSON.stringify(event1),
				JSON.stringify(event2),
			])

			const events = await eventStore.loadByAggregateId('agg-1')

			expect(mockRedis.lrange).toHaveBeenCalledWith('eventstore:agg:agg-1', 0, -1)
			expect(events).toEqual([event1, event2])
		})

		it('應該過濾聚合根型別', async () => {
			const event1: StoredEvent = {
				id: '1',
				eventId: 'evt-1',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			const event2: StoredEvent = {
				id: '2',
				eventId: 'evt-2',
				aggregateId: 'agg-1',
				aggregateType: 'Post',
				eventType: 'PostCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 2,
				occurredAt: new Date().toISOString(),
			}

			mockRedis.lrange.mockResolvedValue([
				JSON.stringify(event1),
				JSON.stringify(event2),
			])

			const events = await eventStore.loadByAggregateId('agg-1', 'User')

			expect(events).toEqual([event1])
		})

		it('應該過濾版本', async () => {
			const event1: StoredEvent = {
				id: '1',
				eventId: 'evt-1',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			const event2: StoredEvent = {
				id: '2',
				eventId: 'evt-2',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserUpdated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 2,
				occurredAt: new Date().toISOString(),
			}

			mockRedis.lrange.mockResolvedValue([
				JSON.stringify(event1),
				JSON.stringify(event2),
			])

			const events = await eventStore.loadByAggregateId('agg-1', undefined, 2)

			expect(events).toEqual([event2])
		})

		it('應該返回空陣列當聚合根不存在', async () => {
			mockRedis.lrange.mockResolvedValue([])

			const events = await eventStore.loadByAggregateId('non-existent')

			expect(events).toEqual([])
		})
	})

	describe('loadByEventType', () => {
		it('應該載入指定事件型別的所有事件', async () => {
			const event1: StoredEvent = {
				id: '1',
				eventId: 'evt-1',
				aggregateId: 'agg-1',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			const event2: StoredEvent = {
				id: '2',
				eventId: 'evt-2',
				aggregateId: 'agg-2',
				aggregateType: 'User',
				eventType: 'UserCreated',
				eventData: '{}',
				eventVersion: 1,
				aggregateVersion: 1,
				occurredAt: new Date().toISOString(),
			}

			mockRedis.lrange.mockResolvedValue([
				JSON.stringify(event1),
				JSON.stringify(event2),
			])

			const events = await eventStore.loadByEventType('UserCreated')

			expect(mockRedis.lrange).toHaveBeenCalledWith('eventstore:type:UserCreated', 0, -1)
			expect(events).toEqual([event1, event2])
		})

		it('應該返回空陣列當事件型別不存在', async () => {
			mockRedis.lrange.mockResolvedValue([])

			const events = await eventStore.loadByEventType('NonExistentEvent')

			expect(events).toEqual([])
		})
	})

	describe('countByAggregateId', () => {
		it('應該返回聚合根的事件數量', async () => {
			mockRedis.llen.mockResolvedValue(5)

			const count = await eventStore.countByAggregateId('agg-1')

			expect(mockRedis.llen).toHaveBeenCalledWith('eventstore:agg:agg-1')
			expect(count).toBe(5)
		})

		it('應該返回 0 當聚合根不存在', async () => {
			mockRedis.llen.mockResolvedValue(0)

			const count = await eventStore.countByAggregateId('non-existent')

			expect(count).toBe(0)
		})
	})
})
