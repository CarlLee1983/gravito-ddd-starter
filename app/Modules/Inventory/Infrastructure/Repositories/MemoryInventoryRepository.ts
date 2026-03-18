/**
 * @file MemoryInventoryRepository.ts
 * @description 庫存 Repository 記憶體實現
 *
 * 用於測試和開發環境，支援樂觀鎖機制。
 */

import { InventoryAggregate } from '../../Domain/Aggregates/InventoryAggregate'
import type { IInventoryRepository } from '../../Domain/Repositories/IInventoryRepository'
import { OptimisticLockException } from '@/Foundation/Application/OptimisticLockException'

/**
 * 記憶體中的庫存記錄
 */
interface InventoryRecord {
	id: string
	productId: string
	skuCode: string
	quantity: number
	reserved: number
	createdAt: Date
	version: number
}

/**
 * 庫存 Repository 記憶體實現
 *
 * 特性：
 * - 在記憶體中存儲庫存數據
 * - 支援樂觀鎖版本控制
 * - 非持久化（進程結束後數據丟失）
 * - 測試時有用的快速實現
 */
export class MemoryInventoryRepository implements IInventoryRepository {
	private records: Map<string, InventoryRecord> = new Map()
	private productIdIndex: Map<string, string> = new Map() // productId → id

	/**
	 * 根據商品 ID 查詢庫存
	 */
	async findByProductId(productId: string): Promise<InventoryAggregate | null> {
		const id = this.productIdIndex.get(productId)
		if (!id) return null
		return this.findById(id)
	}

	/**
	 * 根據 ID 查詢庫存
	 */
	async findById(id: string): Promise<InventoryAggregate | null> {
		const record = this.records.get(id)
		if (!record) return null

		return InventoryAggregate.reconstitute(
			record.id,
			record.skuCode,
			record.quantity,
			record.reserved,
			record.createdAt,
			record.version
		)
	}

	/**
	 * 保存庫存（新增或更新，支援樂觀鎖）
	 *
	 * @throws OptimisticLockException - 版本衝突時拋出
	 */
	async save(inventory: InventoryAggregate): Promise<void> {
		const existing = this.records.get(inventory.id)

		if (existing) {
			// 更新：檢查版本衝突
			if (existing.version !== inventory.version) {
				throw new OptimisticLockException('Inventory', inventory.id, inventory.version)
			}

			// 更新記錄
			this.records.set(inventory.id, {
				id: inventory.id,
				productId: this.productIdIndex.entries().next().value
					? Array.from(this.productIdIndex.entries()).find(([_, id]) => id === inventory.id)?.[0] ||
					  inventory.id
					: inventory.id,
				skuCode: inventory.skuCode,
				quantity: inventory.quantity,
				reserved: inventory.reserved,
				createdAt: inventory.createdAt,
				version: inventory.version + 1, // 遞增版本號
			})
		} else {
			// 新增：建立記錄
			const record: InventoryRecord = {
				id: inventory.id,
				productId: inventory.id, // 預設 productId = id
				skuCode: inventory.skuCode,
				quantity: inventory.quantity,
				reserved: inventory.reserved,
				createdAt: inventory.createdAt,
				version: 0,
			}
			this.records.set(inventory.id, record)
			this.productIdIndex.set(record.productId, inventory.id)
		}
	}

	/**
	 * 刪除庫存記錄
	 */
	async delete(id: string): Promise<void> {
		const record = this.records.get(id)
		if (record) {
			this.productIdIndex.delete(record.productId)
			this.records.delete(id)
		}
	}

	/**
	 * 查詢所有庫存（支援分頁）
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<InventoryAggregate[]> {
		const records = Array.from(this.records.values())
		let result = records

		if (params?.offset) {
			result = result.slice(params.offset)
		}

		if (params?.limit) {
			result = result.slice(0, params.limit)
		}

		return result.map((record) =>
			InventoryAggregate.reconstitute(
				record.id,
				record.skuCode,
				record.quantity,
				record.reserved,
				record.createdAt,
				record.version
			)
		)
	}

	/**
	 * 計算庫存總數
	 */
	async count(): Promise<number> {
		return this.records.size
	}

	// ============================================
	// 測試輔助方法
	// ============================================

	/**
	 * 清空所有數據（測試用）
	 */
	clear(): void {
		this.records.clear()
		this.productIdIndex.clear()
	}

	/**
	 * 取得所有記錄（測試用）
	 */
	getAllRecords(): InventoryRecord[] {
		return Array.from(this.records.values())
	}

	/**
	 * 取得已提交的商品 ID（測試用）
	 */
	getCommittedProductIds(): string[] {
		return Array.from(this.productIdIndex.keys())
	}
}
