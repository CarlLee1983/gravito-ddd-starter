import { describe, it, expect, beforeEach } from 'bun:test'
import { BaseProjector } from '@/Foundation/Infrastructure/Projections/BaseProjector'
import { MemoryProjectionCheckpointStore } from '@/Foundation/Infrastructure/Projections/MemoryProjectionCheckpointStore'
import { MemoryEventStore } from '@/Foundation/Infrastructure/Database/EventStore/MemoryEventStore'
import type { StoredEvent } from '@/Foundation/Infrastructure/Ports/Database/IEventStore'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

// --- 測試用投影狀態 ---
interface OrderCountState {
	totalOrders: number
	totalAmount: number
}

// --- 測試用具體投影類 ---
class OrderCountProjector extends BaseProjector<OrderCountState> {
	readonly name = 'OrderCount'

	protected initialState(): OrderCountState {
		return { totalOrders: 0, totalAmount: 0 }
	}

	protected applyEvent(state: OrderCountState, event: StoredEvent): OrderCountState {
		if (event.eventType === 'OrderPlaced') {
			const data = JSON.parse(event.eventData)
			return {
				totalOrders: state.totalOrders + 1,
				totalAmount: state.totalAmount + (data.amount ?? 0),
			}
		}
		return state
	}
}

// --- 另一個投影（用於多投影獨立測試）---
interface ProductCountState {
	totalProducts: number
}

class ProductCountProjector extends BaseProjector<ProductCountState> {
	readonly name = 'ProductCount'

	protected initialState(): ProductCountState {
		return { totalProducts: 0 }
	}

	protected applyEvent(state: ProductCountState, event: StoredEvent): ProductCountState {
		if (event.eventType === 'ProductCreated') {
			return { totalProducts: state.totalProducts + 1 }
		}
		return state
	}
}

// --- 測試用 Logger ---
function createTestLogger(): ILogger {
	return {
		info: () => {},
		error: () => {},
		warn: () => {},
		debug: () => {},
	}
}

// --- 事件工廠 ---
function createStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		eventId: overrides.eventId ?? crypto.randomUUID(),
		aggregateId: overrides.aggregateId ?? 'agg-1',
		aggregateType: overrides.aggregateType ?? 'Order',
		eventType: overrides.eventType ?? 'OrderPlaced',
		eventData: overrides.eventData ?? JSON.stringify({ amount: 100 }),
		eventVersion: overrides.eventVersion ?? 1,
		aggregateVersion: overrides.aggregateVersion ?? 1,
		occurredAt: overrides.occurredAt ?? new Date().toISOString(),
	}
}

describe('BaseProjector', () => {
	let eventStore: MemoryEventStore
	let checkpointStore: MemoryProjectionCheckpointStore
	let logger: ILogger
	let projector: OrderCountProjector

	beforeEach(() => {
		eventStore = new MemoryEventStore()
		checkpointStore = new MemoryProjectionCheckpointStore()
		logger = createTestLogger()
		projector = new OrderCountProjector(eventStore, logger, checkpointStore)
	})

	// ===================
	// 單元測試（8 個）
	// ===================
	describe('單元測試', () => {
		it('initialState() 傳回正確的初始狀態', async () => {
			const state = await projector.getState()
			expect(state).toEqual({ totalOrders: 0, totalAmount: 0 })
		})

		it('applyEvent() 正確應用單個事件', async () => {
			const event = createStoredEvent({ eventData: JSON.stringify({ amount: 250 }) })
			await projector.project(event)

			const state = await projector.getState()
			expect(state.totalOrders).toBe(1)
			expect(state.totalAmount).toBe(250)
		})

		it('project() 更新狀態和 Checkpoint', async () => {
			const event = createStoredEvent()
			await projector.project(event)

			const state = await projector.getState()
			expect(state.totalOrders).toBe(1)

			const checkpoint = await projector.getCheckpoint()
			expect(checkpoint).not.toBeNull()
			expect(checkpoint!.projectorName).toBe('OrderCount')
			expect(checkpoint!.lastProcessedEventId).toBe(event.id)
		})

		it('checkpoint.processedCount 遞增', async () => {
			const event1 = createStoredEvent({ id: 'evt-1', aggregateVersion: 1 })
			const event2 = createStoredEvent({ id: 'evt-2', aggregateVersion: 2 })

			await projector.project(event1)
			const cp1 = await projector.getCheckpoint()
			expect(cp1!.processedCount).toBe(1)

			await projector.project(event2)
			const cp2 = await projector.getCheckpoint()
			expect(cp2!.processedCount).toBe(2)
		})

		it('lastProcessedEventId 正確記錄', async () => {
			const event1 = createStoredEvent({ id: 'evt-aaa' })
			const event2 = createStoredEvent({ id: 'evt-bbb' })

			await projector.project(event1)
			expect((await projector.getCheckpoint())!.lastProcessedEventId).toBe('evt-aaa')

			await projector.project(event2)
			expect((await projector.getCheckpoint())!.lastProcessedEventId).toBe('evt-bbb')
		})

		it('多個事件逐一應用', async () => {
			const events = [
				createStoredEvent({ id: 'e1', aggregateVersion: 1, eventData: JSON.stringify({ amount: 100 }) }),
				createStoredEvent({ id: 'e2', aggregateVersion: 2, eventData: JSON.stringify({ amount: 200 }) }),
				createStoredEvent({ id: 'e3', aggregateVersion: 3, eventData: JSON.stringify({ amount: 300 }) }),
			]

			for (const event of events) {
				await projector.project(event)
			}

			const state = await projector.getState()
			expect(state.totalOrders).toBe(3)
			expect(state.totalAmount).toBe(600)
		})

		it('getState() 返回當前狀態副本', async () => {
			const event = createStoredEvent()
			await projector.project(event)

			const state1 = await projector.getState()
			const state2 = await projector.getState()

			// 應該是不同的物件參考但相同的值
			expect(state1).toEqual(state2)
			expect(state1).not.toBe(state2)
		})

		it('getCheckpoint() 返回正確的 Checkpoint', async () => {
			// 未投影前應為 null
			expect(await projector.getCheckpoint()).toBeNull()

			const event = createStoredEvent({ id: 'evt-check' })
			await projector.project(event)

			const checkpoint = await projector.getCheckpoint()
			expect(checkpoint).not.toBeNull()
			expect(checkpoint!.projectorName).toBe('OrderCount')
			expect(checkpoint!.lastProcessedEventId).toBe('evt-check')
			expect(checkpoint!.processedCount).toBe(1)
			expect(checkpoint!.lastProcessedAt).toBeInstanceOf(Date)
		})
	})

	// ===================
	// 集成測試（6 個）
	// ===================
	describe('集成測試', () => {
		it('rebuild() 全量重建投影', async () => {
			// 先向 EventStore 寫入事件
			const events = [
				createStoredEvent({ id: 'r1', aggregateId: 'order-1', aggregateVersion: 1, eventData: JSON.stringify({ amount: 100 }) }),
				createStoredEvent({ id: 'r2', aggregateId: 'order-1', aggregateVersion: 2, eventData: JSON.stringify({ amount: 200 }) }),
				createStoredEvent({ id: 'r3', aggregateId: 'order-2', aggregateVersion: 1, eventData: JSON.stringify({ amount: 300 }) }),
			]
			await eventStore.append([events[0]!, events[1]!], 'order-1')
			await eventStore.append([events[2]!], 'order-2')

			await projector.rebuild()

			const state = await projector.getState()
			expect(state.totalOrders).toBe(3)
			expect(state.totalAmount).toBe(600)
		})

		it('rebuild() 後 Checkpoint 重置', async () => {
			const events = [
				createStoredEvent({ id: 'c1', aggregateId: 'order-1', aggregateVersion: 1 }),
				createStoredEvent({ id: 'c2', aggregateId: 'order-1', aggregateVersion: 2 }),
			]
			await eventStore.append(events, 'order-1')

			await projector.rebuild()

			const checkpoint = await projector.getCheckpoint()
			expect(checkpoint).not.toBeNull()
			expect(checkpoint!.processedCount).toBe(2)
			expect(checkpoint!.lastProcessedEventId).toBe('c2')
		})

		it('rebuild() 清空舊狀態', async () => {
			// 先手動投影一些事件
			await projector.project(createStoredEvent({ id: 'old-1', eventData: JSON.stringify({ amount: 999 }) }))
			const stateBeforeRebuild = await projector.getState()
			expect(stateBeforeRebuild.totalOrders).toBe(1)
			expect(stateBeforeRebuild.totalAmount).toBe(999)

			// 向 EventStore 寫入不同的事件
			const newEvent = createStoredEvent({ id: 'new-1', aggregateId: 'order-x', aggregateVersion: 1, eventData: JSON.stringify({ amount: 50 }) })
			await eventStore.append([newEvent], 'order-x')

			// rebuild 應該只包含 EventStore 中的事件
			await projector.rebuild()

			const stateAfterRebuild = await projector.getState()
			expect(stateAfterRebuild.totalOrders).toBe(1)
			expect(stateAfterRebuild.totalAmount).toBe(50)
		})

		it('中斷後可從 Checkpoint 繼續（resume）', async () => {
			// 模擬已處理部分事件
			const event1 = createStoredEvent({ id: 'resume-1', eventData: JSON.stringify({ amount: 100 }) })
			const event2 = createStoredEvent({ id: 'resume-2', eventData: JSON.stringify({ amount: 200 }) })

			await projector.project(event1)

			// 確認 Checkpoint 記錄了第一個事件
			const checkpoint = await projector.getCheckpoint()
			expect(checkpoint!.lastProcessedEventId).toBe('resume-1')
			expect(checkpoint!.processedCount).toBe(1)

			// 模擬斷點續傳：繼續處理第二個事件
			await projector.project(event2)

			const state = await projector.getState()
			expect(state.totalOrders).toBe(2)
			expect(state.totalAmount).toBe(300)

			const finalCheckpoint = await projector.getCheckpoint()
			expect(finalCheckpoint!.lastProcessedEventId).toBe('resume-2')
			expect(finalCheckpoint!.processedCount).toBe(2)
		})

		it('多個投影獨立（不互相影響）', async () => {
			const productProjector = new ProductCountProjector(eventStore, logger, checkpointStore)

			// 向 EventStore 寫入不同型別的事件
			const orderEvent = createStoredEvent({ id: 'oe-1', aggregateId: 'order-1', aggregateVersion: 1, eventType: 'OrderPlaced', eventData: JSON.stringify({ amount: 100 }) })
			const productEvent = createStoredEvent({ id: 'pe-1', aggregateId: 'product-1', aggregateType: 'Product', aggregateVersion: 1, eventType: 'ProductCreated', eventData: JSON.stringify({}) })

			await eventStore.append([orderEvent], 'order-1')
			await eventStore.append([productEvent], 'product-1')

			// 分別 rebuild
			await projector.rebuild()
			await productProjector.rebuild()

			// OrderCount 應只計算 OrderPlaced
			const orderState = await projector.getState()
			expect(orderState.totalOrders).toBe(1)
			expect(orderState.totalAmount).toBe(100)

			// ProductCount 應只計算 ProductCreated
			const productState = await productProjector.getState()
			expect(productState.totalProducts).toBe(1)

			// Checkpoint 獨立
			const orderCheckpoint = await projector.getCheckpoint()
			const productCheckpoint = await productProjector.getCheckpoint()
			expect(orderCheckpoint!.projectorName).toBe('OrderCount')
			expect(productCheckpoint!.projectorName).toBe('ProductCount')
		})

		it('事件重複應用（冪等性）', async () => {
			const event = createStoredEvent({ id: 'idem-1', eventData: JSON.stringify({ amount: 100 }) })

			// 連續投影同一個事件兩次
			await projector.project(event)
			await projector.project(event)

			// 注意：BaseProjector 本身不做去重，冪等性由子類或外部保證
			// 這裡驗證投影機制正常運作（processedCount 會遞增）
			const state = await projector.getState()
			expect(state.totalOrders).toBe(2)

			const checkpoint = await projector.getCheckpoint()
			expect(checkpoint!.processedCount).toBe(2)
			expect(checkpoint!.lastProcessedEventId).toBe('idem-1')
		})
	})
})
