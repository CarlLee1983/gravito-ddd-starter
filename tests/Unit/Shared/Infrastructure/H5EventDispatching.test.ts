/**
 * @file H5EventDispatching.test.ts
 * @description 測試 H5 - BaseEventDispatcher 重試邏輯和死信隊列功能
 *
 * 測試範圍：
 * - 指數退避 (Exponential Backoff) 延遲計算
 * - shouldRetry() 判斷邏輯
 * - BaseEventDispatcher 執行 Handler 和重試
 * - Dead Letter Queue 記錄失敗事件
 * - MemoryEventDispatcher 同步分發
 * - 錯誤聚合和部分失敗處理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryEventDispatcher } from '@/Shared/Infrastructure/Events/Dispatchers/MemoryEventDispatcher'
import { MemoryDeadLetterQueue } from '@/Shared/Infrastructure/Events/Policy/DeadLetterQueue'
import {
	calculateDelay,
	shouldRetry,
	DEFAULT_RETRY_POLICY,
	type RetryPolicy,
} from '@/Shared/Infrastructure/Events/Policy/EventFailurePolicy'
import type { Event } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'

// ==== Test Fixtures ====

class TestEvent implements Event {
	constructor(public readonly testId: string = 'test-1') {}
}

class TestIntegrationEvent implements Event {
	sourceContext = 'TestContext' // 字符串型態，用於區分 IntegrationEvent
	eventType = 'TestIntegrationEvent' // 事件名稱
	constructor(public readonly data: string = 'test-data') {}
}

// ==== Test Suites ====

describe('H5: EventFailurePolicy - Exponential Backoff', () => {
	it('應計算指數退避延遲：0 → 1s → 2s → 4s → 8s', () => {
		const policy = DEFAULT_RETRY_POLICY

		// Attempt 1: 0ms (首次嘗試無延遲)
		expect(calculateDelay(1, policy)).toBe(0)

		// Attempt 2: 1000ms (1s)
		expect(calculateDelay(2, policy)).toBe(1000)

		// Attempt 3: 2000ms (2s)
		expect(calculateDelay(3, policy)).toBe(2000)

		// Attempt 4: 4000ms (4s)
		expect(calculateDelay(4, policy)).toBe(4000)

		// Attempt 5: 8000ms (8s)
		expect(calculateDelay(5, policy)).toBe(8000)
	})

	it('應在延遲超過 maxDelay 時使用上限值', () => {
		const policy = DEFAULT_RETRY_POLICY // maxDelay: 30000

		// Attempt 6: 16000ms (遠小於 maxDelay)
		expect(calculateDelay(6, policy)).toBe(16000)

		// Attempt 7: 32000ms → capped to 30000ms
		expect(calculateDelay(7, policy)).toBe(30000)

		// Attempt 8: 64000ms → capped to 30000ms
		expect(calculateDelay(8, policy)).toBe(30000)
	})

	it('應支援自訂重試策略的初始延遲和倍數', () => {
		const customPolicy: RetryPolicy = {
			initialDelay: 100, // 100ms 而非 1000ms
			backoffMultiplier: 3, // 3x 而非 2x
			maxDelay: 10000,
			maxRetries: 5,
		}

		// Attempt 1: 0ms (首次嘗試無延遲)
		expect(calculateDelay(1, customPolicy)).toBe(0)

		// Attempt 2: 100ms × 3^(2-2) = 100ms
		expect(calculateDelay(2, customPolicy)).toBe(100)

		// Attempt 3: 100ms × 3^(3-2) = 100 × 3 = 300ms
		expect(calculateDelay(3, customPolicy)).toBe(300)

		// Attempt 4: 100ms × 3^(4-2) = 100 × 9 = 900ms
		expect(calculateDelay(4, customPolicy)).toBe(900)

		// Attempt 5: 100ms × 3^(5-2) = 100 × 27 = 2700ms
		expect(calculateDelay(5, customPolicy)).toBe(2700)

		// Attempt 6: 100ms × 3^(6-2) = 100 × 81 = 8100ms
		expect(calculateDelay(6, customPolicy)).toBe(8100)

		// Attempt 7: 100ms × 3^(7-2) = 100 × 243 = 24300ms → capped to 10000ms
		expect(calculateDelay(7, customPolicy)).toBe(10000)
	})
})

describe('H5: EventFailurePolicy - shouldRetry()', () => {
	it('應識別可重試的錯誤類型（網絡超時、連接失敗等）', () => {
		const timeoutError = new Error('Network timeout')
		const connrefusedError = new Error('Error: ECONNREFUSED')
		const connresetError = new Error('Error: ECONNRESET')
		const unavailableError = new Error('Service temporarily unavailable')

		// 這些都是可重試的錯誤
		expect(shouldRetry(timeoutError, 1, 4)).toBe(true)
		expect(shouldRetry(connrefusedError, 1, 4)).toBe(true)
		expect(shouldRetry(connresetError, 1, 4)).toBe(true)
		expect(shouldRetry(unavailableError, 1, 4)).toBe(true)
	})

	it('應在達到最大重試次數時禁止重試', () => {
		const timeoutError = new Error('Network timeout')

		// 達到最大重試次數後不再重試
		expect(shouldRetry(timeoutError, 4, 4)).toBe(false)
		expect(shouldRetry(timeoutError, 5, 4)).toBe(false)
	})

	it('應禁止重試不可恢復的錯誤', () => {
		const validationError = new Error('Invalid argument')
		const typeError = new Error('Unexpected type')
		const customError = new Error('Something went wrong')

		// 這些錯誤不在可重試列表中，不會被重試
		expect(shouldRetry(validationError, 1, 4)).toBe(false)
		expect(shouldRetry(typeError, 1, 4)).toBe(false)
		expect(shouldRetry(customError, 1, 4)).toBe(false)
	})
})

describe('H5: BaseEventDispatcher - Handler 執行和重試', () => {
	let dispatcher: MemoryEventDispatcher
	let dlq: MemoryDeadLetterQueue

	beforeEach(async () => {
		dispatcher = new MemoryEventDispatcher()
		dlq = new MemoryDeadLetterQueue()
		dispatcher.setDeadLetterQueue(dlq)
		await dlq.clear() // 確保每個測試開始時 DLQ 是空的
	})

	it('應成功執行已訂閱的單個 Handler', async () => {
		const handler = vi.fn()
		const event = new TestEvent('test-1')

		dispatcher.subscribe('TestEvent', handler)
		await dispatcher.dispatch(event)

		expect(handler).toHaveBeenCalledWith(event)
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('應執行多個訂閱者 Handler', async () => {
		const handler1 = vi.fn()
		const handler2 = vi.fn()
		const handler3 = vi.fn()
		const event = new TestEvent('test-1')

		dispatcher.subscribe('TestEvent', handler1)
		dispatcher.subscribe('TestEvent', handler2)
		dispatcher.subscribe('TestEvent', handler3)
		await dispatcher.dispatch(event)

		expect(handler1).toHaveBeenCalledWith(event)
		expect(handler2).toHaveBeenCalledWith(event)
		expect(handler3).toHaveBeenCalledWith(event)
	})

	it('應在無訂閱者時優雅處理', async () => {
		const event = new TestEvent('test-1')
		// 應不拋出錯誤
		await expect(dispatcher.dispatch(event)).resolves.toBeUndefined()
	})

	it('應在 Handler 失敗時使用指數退避重試（可重試的錯誤）', async () => {
		const handler = vi.fn()
			.mockRejectedValueOnce(new Error('Network timeout'))
			.mockRejectedValueOnce(new Error('ECONNRESET'))
			.mockResolvedValueOnce(undefined) // Third attempt succeeds

		dispatcher.subscribe('TestEvent', handler)

		const customPolicy: RetryPolicy = {
			initialDelay: 10, // 短延遲以加快測試
			backoffMultiplier: 2,
			maxDelay: 100,
			maxRetries: 4,
		}
		dispatcher.setRetryPolicy(customPolicy)

		const event = new TestEvent('test-1')
		await expect(dispatcher.dispatch(event)).resolves.toBeUndefined()

		// 應呼叫 3 次 (1 失敗 + 1 失敗 + 1 成功)
		expect(handler).toHaveBeenCalledTimes(3)
	})

	it('應在所有重試失敗後將事件寫入死信隊列', async () => {
		const handler = vi.fn().mockRejectedValue(new Error('Network timeout'))

		const policy: RetryPolicy = {
			initialDelay: 10,
			backoffMultiplier: 2,
			maxDelay: 100,
			maxRetries: 3,
		}

		dispatcher.subscribe('TestEvent', handler)
		dispatcher.setRetryPolicy(policy)

		const event = new TestEvent('test-1')

		// dispatch() 完成，但失敗被記錄到死信隊列
		await dispatcher.dispatch(event)

		// 檢查死信隊列
		const entries = await dlq.list()
		expect(entries).toHaveLength(1)
		expect(entries[0].eventName).toBe('TestEvent')
		expect(entries[0].error).toContain('Network timeout')
		expect(entries[0].attempts).toBe(3) // 最大重試 3 次，全部失敗
	})

	it('應處理部分 Handler 失敗的情況', async () => {
		// 創建一個新的 dispatcher 和 DLQ，確保隔離
		const testDispatcher = new MemoryEventDispatcher()
		const testDLQ = new MemoryDeadLetterQueue()
		testDispatcher.setDeadLetterQueue(testDLQ)

		const successHandler = vi.fn().mockResolvedValue(undefined)
		const failHandler = vi.fn().mockRejectedValue(new Error('Network timeout'))

		const policy: RetryPolicy = {
			initialDelay: 10,
			backoffMultiplier: 2,
			maxDelay: 100,
			maxRetries: 3,
		}

		testDispatcher.subscribe('TestEvent', successHandler)
		testDispatcher.subscribe('TestEvent', failHandler)
		testDispatcher.setRetryPolicy(policy)

		const event = new TestEvent('test-1')
		// dispatch() 完成，失敗被記錄但不拋出
		await testDispatcher.dispatch(event)

		// 成功 Handler 應執行 1 次（Promise.allSettled 會並行執行所有 Handler）
		expect(successHandler).toHaveBeenCalledTimes(1)

		// 失敗 Handler 應嘗試 3 次 (初始 1 + 重試 2 = 3 次)
		expect(failHandler).toHaveBeenCalledTimes(3)

		// 死信隊列應只有 failHandler 的記錄
		const entries = await testDLQ.list()
		expect(entries).toHaveLength(1)
		expect(entries[0].reason).toContain('在所有重試都失敗')
	})

	it('應支援配置死信隊列', async () => {
		const handler = vi.fn().mockRejectedValue(new Error('Network timeout'))
		const customDLQ = new MemoryDeadLetterQueue()

		dispatcher.subscribe('TestEvent', handler)
		dispatcher.setDeadLetterQueue(customDLQ)

		const policy: RetryPolicy = {
			initialDelay: 10,
			backoffMultiplier: 2,
			maxDelay: 100,
			maxRetries: 1,
		}
		dispatcher.setRetryPolicy(policy)

		const event = new TestEvent('test-1')
		await dispatcher.dispatch(event)

		const entries = await customDLQ.list()
		expect(entries).toHaveLength(1)
		expect(entries[0].retryable).toBe(true)
	})
})

describe('H5: MemoryDeadLetterQueue - 死信隊列功能', () => {
	let dlq: MemoryDeadLetterQueue

	beforeEach(async () => {
		dlq = new MemoryDeadLetterQueue()
		await dlq.clear() // 確保每個測試開始時 DLQ 是空的
	})

	it('應添加失敗事件到死信隊列', async () => {
		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '123', name: 'Test User' },
			error: 'Database connection failed',
			attempts: 3,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Network timeout',
		})

		const entries = await dlq.list()
		expect(entries).toHaveLength(1)
		expect(entries[0].eventName).toBe('UserCreated')
		expect(entries[0].retryable).toBe(true)
	})

	it('應列出所有死信隊列條目', async () => {
		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '1' },
			error: 'Error 1',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason 1',
		})

		await dlq.add({
			eventName: 'PostCreated',
			eventData: { postId: '1' },
			error: 'Error 2',
			attempts: 2,
			failedAt: new Date().toISOString(),
			retryable: false,
			reason: 'Reason 2',
		})

		const entries = await dlq.list()
		expect(entries).toHaveLength(2)
	})

	it('應按事件名稱篩選死信隊列條目', async () => {
		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '1' },
			error: 'Error 1',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason 1',
		})

		await dlq.add({
			eventName: 'PostCreated',
			eventData: { postId: '1' },
			error: 'Error 2',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason 2',
		})

		const userEntries = await dlq.list('UserCreated')
		expect(userEntries).toHaveLength(1)
		expect(userEntries[0].eventName).toBe('UserCreated')

		const postEntries = await dlq.list('PostCreated')
		expect(postEntries).toHaveLength(1)
		expect(postEntries[0].eventName).toBe('PostCreated')
	})

	it('應根據 ID 獲取特定條目', async () => {
		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '123' },
			error: 'Error',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason',
		})

		const entries = await dlq.list()
		const id = entries[0].id

		const entry = await dlq.get(id)
		expect(entry).not.toBeNull()
		expect(entry?.eventName).toBe('UserCreated')
		expect(entry?.eventData.userId).toBe('123')
	})

	it('應在不存在的 ID 時返回 null', async () => {
		const entry = await dlq.get('non-existent-id')
		expect(entry).toBeNull()
	})

	it('應清空死信隊列', async () => {
		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '1' },
			error: 'Error',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason',
		})

		await dlq.add({
			eventName: 'PostCreated',
			eventData: { postId: '1' },
			error: 'Error',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason',
		})

		let entries = await dlq.list()
		expect(entries).toHaveLength(2)

		await dlq.clear()

		entries = await dlq.list()
		expect(entries).toHaveLength(0)
	})

	it('應提供統計信息', async () => {
		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '1' },
			error: 'Error',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason',
		})

		await dlq.add({
			eventName: 'UserCreated',
			eventData: { userId: '2' },
			error: 'Error',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason',
		})

		await dlq.add({
			eventName: 'PostCreated',
			eventData: { postId: '1' },
			error: 'Error',
			attempts: 1,
			failedAt: new Date().toISOString(),
			retryable: true,
			reason: 'Reason',
		})

		const stats = await dlq.stats()
		expect(stats.total).toBe(3)
		expect(stats.byEventName['UserCreated']).toBe(2)
		expect(stats.byEventName['PostCreated']).toBe(1)
	})
})

describe('H5: MemoryEventDispatcher - Event 名稱提取 (DomainEvent vs IntegrationEvent)', () => {
	let dispatcher: MemoryEventDispatcher

	beforeEach(() => {
		dispatcher = new MemoryEventDispatcher()
	})

	it('應從 DomainEvent 使用 constructor.name 提取事件名稱', async () => {
		const handler = vi.fn()
		const event = new TestEvent('test-1')

		dispatcher.subscribe('TestEvent', handler)
		await dispatcher.dispatch(event)

		expect(handler).toHaveBeenCalledWith(event)
	})

	it('應從 IntegrationEvent 使用 eventType 提取事件名稱', async () => {
		const handler = vi.fn()
		const event = new TestIntegrationEvent('test-data')

		dispatcher.subscribe('TestIntegrationEvent', handler)
		await dispatcher.dispatch(event)

		expect(handler).toHaveBeenCalledWith(event)
	})

	it('應同時支援 DomainEvent 和 IntegrationEvent 分發', async () => {
		const domainHandler = vi.fn()
		const integrationHandler = vi.fn()

		dispatcher.subscribe('TestEvent', domainHandler)
		dispatcher.subscribe('TestIntegrationEvent', integrationHandler)

		const domainEvent = new TestEvent()
		const integrationEvent = new TestIntegrationEvent()

		await dispatcher.dispatch([domainEvent, integrationEvent])

		expect(domainHandler).toHaveBeenCalledWith(domainEvent)
		expect(integrationHandler).toHaveBeenCalledWith(integrationEvent)
	})
})

describe('H5: MemoryEventDispatcher - 批量分發', () => {
	let dispatcher: MemoryEventDispatcher

	beforeEach(() => {
		dispatcher = new MemoryEventDispatcher()
	})

	it('應分發單個事件', async () => {
		const handler = vi.fn()
		dispatcher.subscribe('TestEvent', handler)

		const event = new TestEvent('test-1')
		await dispatcher.dispatch(event)

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('應分發多個事件', async () => {
		const handler1 = vi.fn()
		const handler2 = vi.fn()
		dispatcher.subscribe('TestEvent', handler1)
		dispatcher.subscribe('TestIntegrationEvent', handler2)

		const event1 = new TestEvent('test-1')
		const event2 = new TestIntegrationEvent('test-2')
		await dispatcher.dispatch([event1, event2])

		expect(handler1).toHaveBeenCalledWith(event1)
		expect(handler2).toHaveBeenCalledWith(event2)
	})

	it('應依次分發多個事件，即使某個事件的 Handler 失敗', async () => {
		const handler1 = vi.fn().mockRejectedValue(new Error('Fails'))
		const handler2 = vi.fn()

		dispatcher.subscribe('TestEvent', handler1)
		dispatcher.subscribe('TestIntegrationEvent', handler2)
		dispatcher.setRetryPolicy({
			initialDelay: 10,
			backoffMultiplier: 2,
			maxDelay: 100,
			maxRetries: 1,
		})

		const event1 = new TestEvent('test-1')
		const event2 = new TestIntegrationEvent('test-2')

		// 即使第一個事件失敗，分發仍會繼續處理第二個事件
		await dispatcher.dispatch([event1, event2])

		expect(handler1).toHaveBeenCalled() // 第一個事件的 Handler 被呼叫
		expect(handler2).toHaveBeenCalled() // 第二個事件的 Handler 也被呼叫
	})
})
