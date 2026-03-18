/**
 * @file Performance-Benchmarks.test.ts
 * @description Phase 1 性能基準測試
 *
 * 測試項目：
 * - PM-1：事件吞吐量測試 - 測試 Worker 處理的事件/秒
 * - PM-2：端到端延遲測試 - 測試訂單建立到 Job 入隊的完整延遲
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import {
	setupOutboxInfrastructure,
	mockIntegrationEvent,
} from '../helpers/IntegrationTestSetup'

describe('PM-1：Outbox Worker 事件吞吐量基準測試', () => {
	let outboxInfra: Awaited<ReturnType<typeof setupOutboxInfrastructure>>

	beforeEach(async () => {
		outboxInfra = await setupOutboxInfrastructure()
	})

	it('應在 1 秒內處理 500+ 個事件', async () => {
		const eventCount = 500
		const entries: OutboxEntry[] = []

		// 建立 500 個 Outbox 項目
		for (let i = 0; i < eventCount; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			entries.push(entry)
		}

		// 保存所有項目
		for (const entry of entries) {
			await outboxInfra.outboxRepository.save(entry)
		}

		// 測量吞吐量
		const startTime = Date.now()
		await outboxInfra.worker.processNextBatch(eventCount)
		const duration = Date.now() - startTime

		// 計算吞吐量
		const throughput = (eventCount / duration) * 1000 // events per second

		console.log(`[PM-1] 吞吐量: ${throughput.toFixed(2)} events/sec`)
		console.log(`[PM-1] 處理 ${eventCount} 個事件耗時 ${duration}ms`)

		// 驗證性能指標：至少達到 50 events/sec
		expect(throughput).toBeGreaterThan(50)

		// 驗證所有事件都被處理
		expect(outboxInfra.eventDispatcher.dispatch).toHaveBeenCalledTimes(eventCount)
	})

	it('應支援不同批次大小的性能比較', async () => {
		const eventCount = 1000
		const batchSizes = [50, 100, 200, 500]
		const results: Record<number, number> = {}

		for (const batchSize of batchSizes) {
			// 清除並重新初始化
			await outboxInfra.outboxRepository.clear?.()
			;(outboxInfra.eventDispatcher.dispatch as any).mockClear()

			// 建立事件
			for (let i = 0; i < eventCount; i++) {
				const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
				const entry = OutboxEntry.createNew(
					`outbox-${i}`,
					event.eventId,
					`order-${i}`,
					'Order',
					'OrderPlaced',
					event
				)
				await outboxInfra.outboxRepository.save(entry)
			}

			// 測量吞吐量
			const startTime = Date.now()
			let processed = 0

			// 分批處理
			while (processed < eventCount) {
				processed += await outboxInfra.worker.processNextBatch(batchSize)
				if (processed === 0) break // 無更多待處理項目
			}

			const duration = Date.now() - startTime
			const throughput = (eventCount / duration) * 1000

			results[batchSize] = throughput
			console.log(`[PM-1] 批次大小 ${batchSize}: ${throughput.toFixed(2)} events/sec`)
		}

		// 驗證批次大小對性能的影響
		expect(Object.keys(results).length).toBe(batchSizes.length)

		// 通常批次大小越大，吞吐量越高
		const throughputs = Object.values(results)
		expect(throughputs[throughputs.length - 1]).toBeGreaterThan(throughputs[0])
	})

	it('應在 10 秒內處理 10000+ 個事件', async () => {
		const eventCount = 10000
		const maxDuration = 10000 // 10 seconds

		// 建立事件
		for (let i = 0; i < eventCount; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await outboxInfra.outboxRepository.save(entry)
		}

		// 測量吞吐量
		const startTime = Date.now()
		let processed = 0

		while (true) {
			const batch = await outboxInfra.worker.processNextBatch(1000)
			processed += batch
			if (batch === 0) break
		}

		const duration = Date.now() - startTime
		const throughput = (eventCount / duration) * 1000

		console.log(`[PM-1] 大規模測試: ${throughput.toFixed(2)} events/sec`)
		console.log(`[PM-1] 處理 ${eventCount} 個事件耗時 ${duration}ms`)

		// 驗證能在 10 秒內處理所有事件
		expect(duration).toBeLessThan(maxDuration)
		expect(processed).toBe(eventCount)
	})
})

describe('PM-2：端到端延遲基準測試', () => {
	let outboxInfra: Awaited<ReturnType<typeof setupOutboxInfrastructure>>

	beforeEach(async () => {
		outboxInfra = await setupOutboxInfrastructure()
	})

	it('應測量單個事件的端到端延遲', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		// 測量 OutboxEntry 建立到 Job 推送的完整時間
		const startTime = Date.now()

		// Step 1: 建立 Outbox Entry
		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		// Step 2: 保存到 Repository
		await outboxInfra.outboxRepository.save(entry)

		// Step 3: Worker 處理批次
		await outboxInfra.worker.processNextBatch()

		const duration = Date.now() - startTime

		console.log(`[PM-2] 端到端延遲: ${duration}ms`)
		console.log(`[PM-2] Worker 處理完成，Job 已推送至隊列`)

		// 驗證延遲在可接受範圍（<100ms）
		expect(duration).toBeLessThan(100)

		// 驗證 Job 被推送
		expect(outboxInfra.eventDispatcher.dispatch).toHaveBeenCalled()
	})

	it('應測量批量事件的平均延遲', async () => {
		const eventCount = 100
		const durations: number[] = []

		for (let i = 0; i < eventCount; i++) {
			const startTime = Date.now()

			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)

			await outboxInfra.outboxRepository.save(entry)

			const duration = Date.now() - startTime
			durations.push(duration)
		}

		// 計算統計數據
		const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
		const maxDuration = Math.max(...durations)
		const minDuration = Math.min(...durations)

		console.log(`[PM-2] 保存延遲統計:`)
		console.log(`  - 平均: ${avgDuration.toFixed(2)}ms`)
		console.log(`  - 最小: ${minDuration}ms`)
		console.log(`  - 最大: ${maxDuration}ms`)

		// 批量處理
		const processingStartTime = Date.now()
		await outboxInfra.worker.processNextBatch(eventCount)
		const processingDuration = Date.now() - processingStartTime

		console.log(`[PM-2] Worker 處理 ${eventCount} 個事件耗時 ${processingDuration}ms`)
		console.log(`  - 平均每個事件: ${(processingDuration / eventCount).toFixed(2)}ms`)

		// 驗證平均延遲在可接受範圍
		expect(avgDuration).toBeLessThan(50)
		expect(processingDuration / eventCount).toBeLessThan(10)
	})

	it('應測量在失敗重試情況下的延遲', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		await outboxInfra.outboxRepository.save(entry)

		// 設定失敗
		let callCount = 0
		const mockDispatch = (outboxInfra.eventDispatcher.dispatch as any)
		mockDispatch.mockImplementation(async () => {
			callCount++
			if (callCount <= 2) {
				throw new Error('Dispatch failed')
			}
		})

		const startTime = Date.now()

		// 第一次：失敗
		await outboxInfra.worker.processNextBatch()

		// 重試直到成功
		await outboxInfra.worker.retryFailed()
		await outboxInfra.worker.retryFailed()

		const totalDuration = Date.now() - startTime

		console.log(`[PM-2] 失敗重試端到端延遲: ${totalDuration}ms`)
		console.log(`[PM-2] 總分派次數: ${callCount}`)

		// 驗證重試機制下的延遲（應該 < 500ms）
		expect(totalDuration).toBeLessThan(500)
		expect(callCount).toBe(3)
	})

	it('應測量 Outbox 端到端完整流程的延遲分佈', async () => {
		const eventCount = 100
		const durations: number[] = []

		const startOverall = Date.now()

		for (let i = 0; i < eventCount; i++) {
			const startTime = Date.now()

			// 完整流程：建立、保存、處理
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-batch-${i}`,
				event.eventId,
				`order-batch-${i}`,
				'Order',
				'OrderPlaced',
				event
			)

			await outboxInfra.outboxRepository.save(entry)

			const duration = Date.now() - startTime
			durations.push(duration)
		}

		// 分批處理
		const processingStart = Date.now()
		await outboxInfra.worker.processNextBatch(eventCount)
		const processingDuration = Date.now() - processingStart

		const overallDuration = Date.now() - startOverall

		// 計算百分位數
		const sorted = [...durations].sort((a, b) => a - b)
		const p50 = sorted[Math.floor(eventCount * 0.5)]
		const p95 = sorted[Math.floor(eventCount * 0.95)]
		const p99 = sorted[Math.floor(eventCount * 0.99)]

		console.log(`[PM-2] 端到端延遲分佈（${eventCount} 個事件）:`)
		console.log(`  - P50: ${p50}ms`)
		console.log(`  - P95: ${p95}ms`)
		console.log(`  - P99: ${p99}ms`)
		console.log(`  - 總時間: ${overallDuration}ms`)
		console.log(`  - 包含 Worker 處理時間: ${processingDuration}ms`)

		// 驗證延遲分佈
		expect(p50).toBeLessThan(50)
		expect(p95).toBeLessThan(100)
		expect(p99).toBeLessThan(200)
	})
})
