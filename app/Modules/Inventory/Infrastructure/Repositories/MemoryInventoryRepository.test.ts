/**
 * @file MemoryInventoryRepository.test.ts
 * @description 記憶體庫存 Repository 測試
 *
 * 測試場景：
 * 1. 基本 CRUD 操作
 * 2. 樂觀鎖版本控制
 * 3. 索引管理（productId → id）
 * 4. 分頁查詢
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryInventoryRepository } from './MemoryInventoryRepository'
import { InventoryAggregate } from '../../Domain/Aggregates/InventoryAggregate'
import { OptimisticLockException } from '@/Foundation/Application/OptimisticLockException'

describe('MemoryInventoryRepository', () => {
	let repo: MemoryInventoryRepository

	beforeEach(() => {
		repo = new MemoryInventoryRepository()
		repo.clear()
	})

	describe('CRUD Operations', () => {
		it('應該保存新的庫存', async () => {
			const inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)

			await repo.save(inventory)
			const found = await repo.findById('inv-001')

			expect(found).toBeDefined()
			expect(found?.quantity).toBe(100)
			expect(found?.skuCode).toBe('SKU-001')
		})

		it('應該根據 ID 查找庫存', async () => {
			const inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			const found = await repo.findById('inv-001')

			expect(found?.id).toBe('inv-001')
		})

		it('應該根據商品 ID 查找庫存', async () => {
			const inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			const found = await repo.findByProductId('inv-001')

			expect(found?.id).toBe('inv-001')
		})

		it('應該在找不到時返回 null', async () => {
			const found = await repo.findById('non-existent')

			expect(found).toBeNull()
		})

		it('應該更新現有庫存', async () => {
			let inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 重新載入以獲得正確的版本（關鍵：樂觀鎖需要版本同步）
			inventory = (await repo.findById('inv-001'))!
			inventory.reserve(10, 'order-001')
			await repo.save(inventory)

			const found = await repo.findById('inv-001')
			expect(found?.reserved).toBe(10)
		})

		it('應該刪除庫存', async () => {
			const inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			await repo.delete('inv-001')
			const found = await repo.findById('inv-001')

			expect(found).toBeNull()
		})

		it('應該計算庫存總數', async () => {
			const inv1 = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			const inv2 = InventoryAggregate.create('inv-002', 'SKU-002', 200)

			await repo.save(inv1)
			await repo.save(inv2)

			const count = await repo.count()
			expect(count).toBe(2)
		})
	})

	describe('Optimistic Locking', () => {
		it('應該在版本衝突時拋出異常', async () => {
			const inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 模擬版本衝突：直接修改內部版本號
			const found = (await repo.findById('inv-001')) as any
			;(found as any)._version = 5 // 不匹配的版本

			// 嘗試保存應該拋出異常
			await expect(repo.save(found)).rejects.toThrow(OptimisticLockException)
		})

		it('應該允許序列版本更新', async () => {
			let inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 第一次更新：重新載入
			inventory = (await repo.findById('inv-001'))!
			inventory.reserve(10, 'order-001')
			await repo.save(inventory)

			// 第二次更新：重新載入
			inventory = (await repo.findById('inv-001'))!
			inventory.reserve(5, 'order-002')
			await repo.save(inventory)

			const result = await repo.findById('inv-001')
			expect(result?.reserved).toBe(15)
		})
	})

	describe('Pagination', () => {
		it('應該支援限制記錄數', async () => {
			const inventories = Array.from({ length: 10 }, (_, i) =>
				InventoryAggregate.create(`inv-${i + 1}`, `SKU-${i + 1}`, 100)
			)

			for (const inv of inventories) {
				await repo.save(inv)
			}

			const results = await repo.findAll({ limit: 5 })
			expect(results).toHaveLength(5)
		})

		it('應該支援偏移查詢', async () => {
			const inventories = Array.from({ length: 10 }, (_, i) =>
				InventoryAggregate.create(`inv-${i + 1}`, `SKU-${i + 1}`, 100)
			)

			for (const inv of inventories) {
				await repo.save(inv)
			}

			const results = await repo.findAll({ offset: 5, limit: 5 })
			expect(results).toHaveLength(5)
		})

		it('應該在無偏移和限制時返回所有記錄', async () => {
			const inventories = Array.from({ length: 5 }, (_, i) =>
				InventoryAggregate.create(`inv-${i + 1}`, `SKU-${i + 1}`, 100)
			)

			for (const inv of inventories) {
				await repo.save(inv)
			}

			const results = await repo.findAll()
			expect(results).toHaveLength(5)
		})
	})

	describe('Business Operations', () => {
		it('應該支援預留庫存操作', async () => {
			let inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 重新載入以獲得正確的版本
			inventory = (await repo.findById('inv-001'))!
			inventory.reserve(30, 'order-001')
			await repo.save(inventory)

			const result = await repo.findById('inv-001')
			expect(result?.reserved).toBe(30)
			expect(result?.available).toBe(70)
		})

		it('應該支援扣減庫存操作', async () => {
			let inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 第一次操作：預留
			inventory = (await repo.findById('inv-001'))!
			inventory.reserve(30, 'order-001')
			await repo.save(inventory)

			// 第二次操作：扣減
			inventory = (await repo.findById('inv-001'))!
			inventory.deduct(30, 'order-001')
			await repo.save(inventory)

			const result = await repo.findById('inv-001')
			expect(result?.quantity).toBe(70) // 100 - 30
			expect(result?.reserved).toBe(0)
		})

		it('應該支援釋放預留庫存', async () => {
			let inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 第一次操作：預留
			inventory = (await repo.findById('inv-001'))!
			inventory.reserve(30, 'order-001')
			await repo.save(inventory)

			// 第二次操作：釋放
			inventory = (await repo.findById('inv-001'))!
			inventory.release(30, 'order-001')
			await repo.save(inventory)

			const result = await repo.findById('inv-001')
			expect(result?.reserved).toBe(0)
			expect(result?.available).toBe(100)
		})
	})

	describe('Test Helpers', () => {
		it('應該清空所有數據', async () => {
			const inv1 = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			const inv2 = InventoryAggregate.create('inv-002', 'SKU-002', 200)

			await repo.save(inv1)
			await repo.save(inv2)

			repo.clear()

			const count = await repo.count()
			expect(count).toBe(0)
		})

		it('應該取得所有記錄（測試用）', async () => {
			const inv1 = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			const inv2 = InventoryAggregate.create('inv-002', 'SKU-002', 200)

			await repo.save(inv1)
			await repo.save(inv2)

			const records = repo.getAllRecords()
			expect(records).toHaveLength(2)
		})

		it('應該取得已提交的商品 ID（測試用）', async () => {
			const inv1 = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			const inv2 = InventoryAggregate.create('inv-002', 'SKU-002', 200)

			await repo.save(inv1)
			await repo.save(inv2)

			const productIds = repo.getCommittedProductIds()
			expect(productIds).toContain('inv-001')
			expect(productIds).toContain('inv-002')
		})
	})

	describe('Concurrent Operations', () => {
		it('應該在並發更新時檢測版本衝突', async () => {
			let inventory = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			await repo.save(inventory)

			// 模擬兩個並發更新：載入相同的版本
			const found1 = (await repo.findById('inv-001'))!
			const found2 = (await repo.findById('inv-001'))!

			// 第一個更新成功
			found1.reserve(10, 'order-001')
			await repo.save(found1)

			// 第二個更新應該失敗（版本衝突）
			found2.reserve(20, 'order-002')
			await expect(repo.save(found2)).rejects.toThrow(OptimisticLockException)
		})
	})
})
