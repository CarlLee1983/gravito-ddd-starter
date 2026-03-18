/**
 * @file AtlasInventoryRepository.ts
 * @description 庫存 Repository Atlas ORM 實現
 *
 * 使用 @gravito/atlas 作為 ORM，支援樂觀鎖機制。
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { InventoryAggregate } from '../../Domain/Aggregates/InventoryAggregate'
import type { IInventoryRepository } from '../../Domain/Repositories/IInventoryRepository'
import { OptimisticLockException } from '@/Foundation/Application/OptimisticLockException'

/**
 * 庫存 Repository Atlas ORM 實現
 *
 * 特性：
 * - 使用 Atlas ORM 進行數據庫操作
 * - 支援樂觀鎖版本控制
 * - 自動事務管理
 * - 完全 ORM 無關（只依賴 IDatabaseAccess）
 */
export class AtlasInventoryRepository implements IInventoryRepository {
	/**
	 * 初始化 Atlas Repository
	 *
	 * @param db - 資料庫存取 Port
	 * @param eventDispatcher - 事件分派器（可選）
	 */
	constructor(
		private readonly db: IDatabaseAccess,
		private readonly eventDispatcher?: IEventDispatcher
	) {}

	/**
	 * 根據商品 ID 查詢庫存
	 */
	async findByProductId(productId: string): Promise<InventoryAggregate | null> {
		const row = await this.db.table('inventories').where('product_id', '=', productId).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 根據 ID 查詢庫存
	 */
	async findById(id: string): Promise<InventoryAggregate | null> {
		const row = await this.db.table('inventories').where('id', '=', id).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 保存庫存（新增或更新，支援樂觀鎖）
	 *
	 * @throws OptimisticLockException - 版本衝突時拋出
	 */
	async save(inventory: InventoryAggregate): Promise<void> {
		const row = this.toRow(inventory)

		// 在事務中進行樂觀鎖檢查和保存
		await this.db.transaction(async (trx) => {
			const existing = await trx.table('inventories').where('id', '=', inventory.id).first()

			if (existing) {
				// 更新：檢查版本衝突
				const currentVersion = existing.version ?? 0
				const newVersion = currentVersion + 1

				// 驗證版本衝突
				const beforeUpdate = await trx
					.table('inventories')
					.where('id', '=', inventory.id)
					.where('version', '=', currentVersion)
					.first()

				if (!beforeUpdate) {
					throw new OptimisticLockException('Inventory', inventory.id, currentVersion)
				}

				// 條件更新
				await trx
					.table('inventories')
					.where('id', '=', inventory.id)
					.where('version', '=', currentVersion)
					.update({ ...row, version: newVersion })
			} else {
				// 新增：初始版本為 0
				await trx.table('inventories').insert({ ...row, version: 0 })
			}
		})

		// 事務外：分派事件
		if (this.eventDispatcher && 'getUncommittedEvents' in inventory) {
			const events = (inventory as any).getUncommittedEvents?.() ?? []
			for (const event of events) {
				await this.eventDispatcher.dispatch(event)
			}
			;(inventory as any).markEventsAsCommitted?.()
		}
	}

	/**
	 * 刪除庫存記錄
	 */
	async delete(id: string): Promise<void> {
		await this.db.table('inventories').where('id', '=', id).delete()
	}

	/**
	 * 查詢所有庫存（支援分頁）
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<InventoryAggregate[]> {
		let query = this.db.table('inventories')

		if (params?.offset) {
			query = query.offset(params.offset)
		}

		if (params?.limit) {
			query = query.limit(params.limit)
		}

		const rows = await query.select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 計算庫存總數
	 */
	async count(): Promise<number> {
		const result = await this.db.table('inventories').count()
		// count() 返回 {count: number} 或類似結構
		return typeof result === 'number' ? result : (result as any).count ?? 0
	}

	// ============================================
	// 資料轉換方法
	// ============================================

	/**
	 * 資料庫行 → Domain 聚合根
	 */
	private toDomain(row: any): InventoryAggregate {
		return InventoryAggregate.reconstitute(
			row.id,
			row.sku_code,
			Number(row.quantity),
			Number(row.reserved),
			new Date(row.created_at),
			Number(row.version ?? 0)
		)
	}

	/**
	 * Domain 聚合根 → 資料庫行
	 */
	private toRow(inventory: InventoryAggregate): Record<string, any> {
		return {
			id: inventory.id,
			product_id: inventory.id, // 預設 productId = id
			sku_code: inventory.skuCode,
			quantity: inventory.quantity,
			reserved: inventory.reserved,
			created_at: inventory.createdAt.toISOString(),
			// version 由 save() 方法自動管理，不在這裡設定
		}
	}
}
