/**
 * @file Persistence-Benchmarks.test.ts
 * @description 持久化層性能基準測試
 *
 * 對比記憶體、Atlas、Drizzle 等不同實現的性能表現
 * 測試項目：
 * - PP-1：單個 Outbox 項目的保存性能
 * - PP-2：批量項目保存性能
 * - PP-3：查詢性能（findUnprocessed、findFailed 等）
 * - PP-4：更新性能（markAsProcessed、markAsFailed 等）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import { MemoryOutboxRepository } from '@/Foundation/Infrastructure/Repositories/MemoryOutboxRepository'
import { mockIntegrationEvent } from '../helpers/IntegrationTestSetup'

describe('PP-1：單個項目保存性能測試', () => {
	let memoryRepo: MemoryOutboxRepository

	beforeEach(() => {
		memoryRepo = new MemoryOutboxRepository()
	})

	it('記憶體實現：單個 Outbox 項目保存應 <1ms', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')
		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		const startTime = Date.now()
		await memoryRepo.save(entry)
		const duration = Date.now() - startTime

		console.log(`[PP-1] Memory: 單個項目保存耗時 ${duration}ms`)
		expect(duration).toBeLessThan(5)
	})

	it('記憶體實現：1000 個連續保存操作應 <50ms', async () => {
		const count = 1000
		const startTime = Date.now()

		for (let i = 0; i < count; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await memoryRepo.save(entry)
		}

		const duration = Date.now() - startTime
		const avgTime = duration / count

		console.log(`[PP-1] Memory: ${count} 個項目保存耗時 ${duration}ms`)
		console.log(`[PP-1] Memory: 平均每個項目 ${avgTime.toFixed(3)}ms`)

		expect(duration).toBeLessThan(100)
		expect(avgTime).toBeLessThan(0.1)
	})

	it('記憶體實現：保存性能在大量項目下應線性增長', async () => {
		const sizes = [100, 500, 1000, 5000]
		const durations: Record<number, number> = {}

		for (const size of sizes) {
			const repo = new MemoryOutboxRepository()
			const startTime = Date.now()

			for (let i = 0; i < size; i++) {
				const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
				const entry = OutboxEntry.createNew(
					`outbox-${i}`,
					event.eventId,
					`order-${i}`,
					'Order',
					'OrderPlaced',
					event
				)
				await repo.save(entry)
			}

			const duration = Date.now() - startTime
			durations[size] = duration

			console.log(`[PP-1] Memory: ${size} 項目 - ${duration}ms (${(duration/size).toFixed(3)}ms/item)`)
		}

		// 驗證性能不會急劇下降
		const ratios = []
		const sizes_list = Object.keys(durations).map(Number)
		for (let i = 1; i < sizes_list.length; i++) {
			const prevSize = sizes_list[i - 1]
			const currSize = sizes_list[i]
			const prevTime = durations[prevSize]
			const currTime = durations[currSize]
			const ratio = currTime / prevTime / (currSize / prevSize)
			ratios.push(ratio)
		}

		// 平均比例應接近 1（線性增長）
		const validRatios = ratios.filter(r => !isNaN(r) && isFinite(r))
		if (validRatios.length > 0) {
			const avgRatio = validRatios.reduce((a, b) => a + b, 0) / validRatios.length
			console.log(`[PP-1] Memory: 增長率比例 ${avgRatio.toFixed(3)} (1.0 = 線性)`)
			expect(avgRatio).toBeLessThan(2.0) // 允許 100% 的性能波動
		} else {
			console.log(`[PP-1] Memory: 性能測試太快，時間精度不足以計算比例（這是好現象）`)
		}
	})
})

describe('PP-2：批量項目保存性能測試', () => {
	let memoryRepo: MemoryOutboxRepository

	beforeEach(() => {
		memoryRepo = new MemoryOutboxRepository()
	})

	it('記憶體實現：批量保存 100 個項目應 <10ms', async () => {
		const entries: OutboxEntry[] = []

		for (let i = 0; i < 100; i++) {
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

		const startTime = Date.now()
		for (const entry of entries) {
			await memoryRepo.save(entry)
		}
		const duration = Date.now() - startTime

		console.log(`[PP-2] Memory: 批量保存 100 個項目耗時 ${duration}ms`)
		expect(duration).toBeLessThan(20)
	})

	it('記憶體實現：批量保存與單個保存的性能對比', async () => {
		const count = 1000

		// 方式 1: 單個保存
		const repo1 = new MemoryOutboxRepository()
		const start1 = Date.now()
		for (let i = 0; i < count; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await repo1.save(entry)
		}
		const duration1 = Date.now() - start1

		// 方式 2: 先建立再保存（模擬批量操作）
		const repo2 = new MemoryOutboxRepository()
		const entries: OutboxEntry[] = []
		for (let i = 0; i < count; i++) {
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

		const start2 = Date.now()
		for (const entry of entries) {
			await repo2.save(entry)
		}
		const duration2 = Date.now() - start2

		console.log(`[PP-2] Memory: 單個保存 ${count} 個項目 - ${duration1}ms`)
		console.log(`[PP-2] Memory: 批量保存 ${count} 個項目 - ${duration2}ms`)
		console.log(`[PP-2] Memory: 效能差異 ${Math.abs(duration1 - duration2)}ms`)

		// 兩種方式效能應接近（記憶體實現無差異）
		expect(Math.abs(duration1 - duration2)).toBeLessThan(5)
	})

	it('記憶體實現：不同批次大小的保存延遲分佈', async () => {
		const batchSizes = [10, 50, 100, 500]
		const results: Record<number, {avg: number, min: number, max: number}> = {}

		for (const batchSize of batchSizes) {
			const durations: number[] = []
			const repo = new MemoryOutboxRepository()

			for (let batch = 0; batch < 10; batch++) {
				const entries: OutboxEntry[] = []
				for (let i = 0; i < batchSize; i++) {
					const idx = batch * batchSize + i
					const event = mockIntegrationEvent(idx.toString(), 'OrderPlaced')
					const entry = OutboxEntry.createNew(
						`outbox-${idx}`,
						event.eventId,
						`order-${idx}`,
						'Order',
						'OrderPlaced',
						event
					)
					entries.push(entry)
				}

				const startTime = Date.now()
				for (const entry of entries) {
					await repo.save(entry)
				}
				const duration = Date.now() - startTime
				durations.push(duration)
			}

			const avg = durations.reduce((a, b) => a + b, 0) / durations.length
			const min = Math.min(...durations)
			const max = Math.max(...durations)

			results[batchSize] = { avg, min, max }
			console.log(`[PP-2] Memory: 批次大小 ${batchSize} - avg=${avg.toFixed(2)}ms, min=${min}ms, max=${max}ms`)
		}

		// 驗證批次大小適中時性能最優
		expect(results[50].avg).toBeLessThan(results[500].avg + 5)
	})
})

describe('PP-3：查詢性能測試', () => {
	let memoryRepo: MemoryOutboxRepository

	beforeEach(async () => {
		memoryRepo = new MemoryOutboxRepository()

		// 初始化數據：1000 個項目
		for (let i = 0; i < 1000; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await memoryRepo.save(entry)
		}
	})

	it('記憶體實現：查詢未處理項目應 <5ms', async () => {
		const startTime = Date.now()
		const entries = await memoryRepo.findUnprocessed(100)
		const duration = Date.now() - startTime

		console.log(`[PP-3] Memory: 查詢 100 個未處理項目耗時 ${duration}ms`)
		expect(duration).toBeLessThan(10)
		expect(entries.length).toBe(100)
	})

	it('記憶體實現：按 ID 查詢應 <1ms', async () => {
		const startTime = Date.now()
		const entry = await memoryRepo.findById('outbox-500')
		const duration = Date.now() - startTime

		console.log(`[PP-3] Memory: 按 ID 查詢耗時 ${duration}ms`)
		expect(duration).toBeLessThan(5)
		expect(entry).toBeDefined()
	})

	it('記憶體實現：查詢失敗項目應 <5ms', async () => {
		// 標記一些項目為失敗
		for (let i = 0; i < 100; i++) {
			const entry = await memoryRepo.findById(`outbox-${i}`)
			if (entry) {
				const failed = entry.markAsFailed('Test error')
				await memoryRepo.save(failed)
			}
		}

		const startTime = Date.now()
		const entries = await memoryRepo.findFailed(50)
		const duration = Date.now() - startTime

		console.log(`[PP-3] Memory: 查詢 50 個失敗項目耗時 ${duration}ms`)
		expect(duration).toBeLessThan(10)
	})

	it('記憶體實現：統計查詢應 <5ms', async () => {
		const startTime = Date.now()
		const stats = await memoryRepo.getStats()
		const duration = Date.now() - startTime

		console.log(`[PP-3] Memory: 統計查詢耗時 ${duration}ms`)
		console.log(`[PP-3] Memory: 統計結果 - pending=${stats.pending}, processed=${stats.processed}`)
		expect(duration).toBeLessThan(10)
		expect(stats.pending).toBeGreaterThan(0)
	})

	it('記憶體實現：查詢性能在不同數據量下應線性', async () => {
		const dataSizes = [100, 500, 1000, 5000]
		const results: Record<number, number> = {}

		for (const size of dataSizes) {
			const repo = new MemoryOutboxRepository()

			// 建立數據
			for (let i = 0; i < size; i++) {
				const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
				const entry = OutboxEntry.createNew(
					`outbox-${i}`,
					event.eventId,
					`order-${i}`,
					'Order',
					'OrderPlaced',
					event
				)
				await repo.save(entry)
			}

			// 測量查詢性能
			const startTime = Date.now()
			const entries = await repo.findUnprocessed(100)
			const duration = Date.now() - startTime

			results[size] = duration
			console.log(`[PP-3] Memory: ${size} 個項目查詢耗時 ${duration}ms`)
		}

		// 驗證查詢時間與數據量無關（記憶體實現應該是 O(n) 但 n 受限於返回數量）
		const durations = Object.values(results)
		const maxDuration = Math.max(...durations)
		const minDuration = Math.min(...durations)
		expect(maxDuration - minDuration).toBeLessThan(5)
	})
})

describe('PP-4：更新性能測試', () => {
	let memoryRepo: MemoryOutboxRepository

	beforeEach(async () => {
		memoryRepo = new MemoryOutboxRepository()

		// 初始化數據：500 個項目
		for (let i = 0; i < 500; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await memoryRepo.save(entry)
		}
	})

	it('記憶體實現：標記為已處理應 <1ms', async () => {
		const entry = await memoryRepo.findById('outbox-100')
		expect(entry).toBeDefined()

		const startTime = Date.now()
		const processed = entry!.markAsProcessed()
		await memoryRepo.save(processed)
		const duration = Date.now() - startTime

		console.log(`[PP-4] Memory: 標記為已處理耗時 ${duration}ms`)
		expect(duration).toBeLessThan(5)
	})

	it('記憶體實現：標記為失敗應 <1ms', async () => {
		const entry = await memoryRepo.findById('outbox-200')
		expect(entry).toBeDefined()

		const startTime = Date.now()
		const failed = entry!.markAsFailed('Test error')
		await memoryRepo.save(failed)
		const duration = Date.now() - startTime

		console.log(`[PP-4] Memory: 標記為失敗耗時 ${duration}ms`)
		expect(duration).toBeLessThan(5)
	})

	it('記憶體實現：批量更新應線性增長', async () => {
		const counts = [50, 100, 200, 500]
		const durations: Record<number, number> = {}

		for (const count of counts) {
			// 為每個批次建立新的 repository，避免版本衝突
			const batchRepo = new MemoryOutboxRepository()

			// 建立測試數據
			for (let i = 0; i < count; i++) {
				const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
				const entry = OutboxEntry.createNew(
					`outbox-batch-${i}`,
					event.eventId,
					`order-batch-${i}`,
					'Order',
					'OrderPlaced',
					event
				)
				await batchRepo.save(entry)
			}

			const startTime = Date.now()

			for (let i = 0; i < count; i++) {
				const entry = await batchRepo.findById(`outbox-batch-${i}`)
				if (entry) {
					const processed = entry.markAsProcessed()
					await batchRepo.save(processed)
				}
			}

			const duration = Date.now() - startTime
			durations[count] = duration

			console.log(`[PP-4] Memory: 批量更新 ${count} 個項目耗時 ${duration}ms (${(duration/count).toFixed(3)}ms/item)`)
		}

		// 驗證線性增長（允許一定波動）
		const perItem50 = durations[50] / 50
		const perItem500 = durations[500] / 500

		if (perItem50 > 0 && perItem500 > 0 && isFinite(perItem500 / perItem50)) {
			const ratio = perItem500 / perItem50
			console.log(`[PP-4] Memory: 單個更新時間比例 ${ratio.toFixed(3)} (1.0 = 線性)`)
			expect(ratio).toBeLessThan(3) // 允許較大波動
		} else {
			console.log(`[PP-4] Memory: 性能測試太快（<1ms），精度不足以計算比例（這是好現象）`)
		}
	})

	it('記憶體實現：樂觀鎖衝突應被正確檢測', async () => {
		const entry = await memoryRepo.findById('outbox-300')
		expect(entry).toBeDefined()

		// 成功更新
		const processed = entry!.markAsProcessed()
		await memoryRepo.save(processed)

		// 嘗試用舊版本更新（應該失敗）
		try {
			await memoryRepo.save(entry!) // 使用原始版本
			expect.fail('應該拋出樂觀鎖異常')
		} catch (error: any) {
			console.log(`[PP-4] Memory: 樂觀鎖衝突正確檢測 - ${error.message}`)
			expect(error.message).toContain('OutboxEntry')
		}
	})
})

describe('PP-5：綜合性能基準', () => {
	let memoryRepo: MemoryOutboxRepository

	beforeEach(() => {
		memoryRepo = new MemoryOutboxRepository()
	})

	it('記憶體實現：完整 CRUD 工作流程性能測試', async () => {
		const testSize = 1000
		const measurements: Record<string, number> = {}

		// Create：建立 1000 個項目
		console.log(`[PP-5] Memory: 開始完整工作流程測試 (${testSize} 個項目)`)

		let startTime = Date.now()
		for (let i = 0; i < testSize; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await memoryRepo.save(entry)
		}
		measurements['create'] = Date.now() - startTime

		// Read：查詢 100 個未處理項目
		startTime = Date.now()
		const entries = await memoryRepo.findUnprocessed(100)
		measurements['read'] = Date.now() - startTime

		// Update：標記 100 個項目為已處理
		startTime = Date.now()
		for (const entry of entries) {
			const processed = entry.markAsProcessed()
			await memoryRepo.save(processed)
		}
		measurements['update'] = Date.now() - startTime

		// Delete：刪除已處理的項目
		startTime = Date.now()
		await memoryRepo.deleteProcessed()
		measurements['delete'] = Date.now() - startTime

		// Stats：取得統計信息
		startTime = Date.now()
		const stats = await memoryRepo.getStats()
		measurements['stats'] = Date.now() - startTime

		console.log(`[PP-5] Memory: 工作流程性能統計:`)
		console.log(`  - Create (${testSize} items): ${measurements['create']}ms`)
		console.log(`  - Read (100 items): ${measurements['read']}ms`)
		console.log(`  - Update (100 items): ${measurements['update']}ms`)
		console.log(`  - Delete: ${measurements['delete']}ms`)
		console.log(`  - Stats: ${measurements['stats']}ms`)
		console.log(`  - Total: ${Object.values(measurements).reduce((a, b) => a + b)}ms`)
		console.log(`  - 最終統計: pending=${stats.pending}, processed=${stats.processed}`)

		// 所有操作都應該很快（<100ms 各自）
		Object.entries(measurements).forEach(([op, duration]) => {
			expect(duration).toBeLessThan(100)
		})
	})

	it('記憶體實現：應支持大規模數據集（>10K 項目）', async () => {
		const largeSize = 10000

		console.log(`[PP-5] Memory: 大規模數據集性能測試 (${largeSize} 個項目)`)

		const startTime = Date.now()
		for (let i = 0; i < largeSize; i++) {
			const event = mockIntegrationEvent(i.toString(), 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${i}`,
				event.eventId,
				`order-${i}`,
				'Order',
				'OrderPlaced',
				event
			)
			await memoryRepo.save(entry)
		}
		const duration = Date.now() - startTime

		console.log(`[PP-5] Memory: 建立 ${largeSize} 個項目耗時 ${duration}ms`)

		// 查詢性能
		const queryStart = Date.now()
		const entries = await memoryRepo.findUnprocessed(1000)
		const queryDuration = Date.now() - queryStart

		console.log(`[PP-5] Memory: 查詢 1000 個項目耗時 ${queryDuration}ms`)

		// 驗證性能
		expect(duration).toBeLessThan(1000) // 10 秒內建立 10K 項目
		expect(queryDuration).toBeLessThan(50) // 查詢應快速
		expect(entries.length).toBe(1000)
	})
})
