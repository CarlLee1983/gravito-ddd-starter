/**
 * @file Inventory.integration.test.ts
 * @description Inventory 模組整合測試
 *
 * 測試場景：
 * 1. 模組匯出驗證
 * 2. 聚合根與值物件
 * 3. Repository 實現列表
 */

import { describe, it, expect } from 'vitest'

describe('Inventory Module Integration', () => {
	describe('Module Exports', () => {
		it('應該匯出 InventoryAggregate', async () => {
			const { InventoryAggregate } = await import('./index')
			expect(InventoryAggregate).toBeDefined()

			const inv = InventoryAggregate.create('inv-001', 'SKU-001', 100)
			expect(inv).toBeDefined()
			expect(inv.id).toBe('inv-001')
			expect(inv.skuCode).toBe('SKU-001')
			expect(inv.quantity).toBe(100)
		})

		it('應該匯出 SKU 值物件', async () => {
			const { SKU } = await import('./Domain/ValueObjects/SKU')
			const sku = SKU.create('SKU-001', 50)
			expect(sku).toBeDefined()
			expect(sku.code).toBe('SKU-001')
			expect(sku.quantity).toBe(50)
		})

		it('應該匯出所有事件', async () => {
			const {
				InventoryReserved,
				InventoryDeducted,
				InventoryReleased,
			} = await import('./index')
			expect(InventoryReserved).toBeDefined()
			expect(InventoryDeducted).toBeDefined()
			expect(InventoryReleased).toBeDefined()
		})

		it('應該匯出所有 Repository 實現', async () => {
			const {
				MemoryInventoryRepository,
				AtlasInventoryRepository,
				DrizzleInventoryRepository,
			} = await import('./index')
			expect(MemoryInventoryRepository).toBeDefined()
			expect(AtlasInventoryRepository).toBeDefined()
			expect(DrizzleInventoryRepository).toBeDefined()
		})

		it('應該匯出 IInventoryRepository 介面', async () => {
			const repo = await import('./Domain/Repositories/IInventoryRepository')
			expect(repo).toBeDefined()
		})

		it('應該匯出應用層服務', async () => {
			const {
				ReserveInventoryService,
				DeductInventoryService,
			} = await import('./index')
			expect(ReserveInventoryService).toBeDefined()
			expect(DeductInventoryService).toBeDefined()
		})
	})

	describe('Repository Interface Contract', () => {
		it('MemoryInventoryRepository 應該實現 IInventoryRepository', async () => {
			const { MemoryInventoryRepository } = await import('./index')
			const repo = new MemoryInventoryRepository()

			expect(repo.findById).toBeDefined()
			expect(repo.findByProductId).toBeDefined()
			expect(repo.save).toBeDefined()
			expect(repo.delete).toBeDefined()
			expect(repo.findAll).toBeDefined()
			expect(repo.count).toBeDefined()
		})
	})

	describe('Module Definition', () => {
		it('應該導出 inventoryModule IModuleDefinition', async () => {
			const { inventoryModule } = await import('./index')
			expect(inventoryModule).toBeDefined()
			expect(inventoryModule.name).toBe('Inventory')
			expect(inventoryModule.registerRepositories).toBeDefined()
			expect(inventoryModule.registerRoutes).toBeDefined()
		})
	})
})
