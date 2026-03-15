/**
 * @file BaseEventSourcedRepository.ts
 * @description Event Sourcing 基底 Repository 類別
 *
 * 封裝所有 Event Sourcing Repository 共有的邏輯：
 * - 樂觀鎖版本控制 (Optimistic Locking)
 * - 領域事件分派 (Domain Event Dispatching)
 * - 事件存儲持久化 (Event Store Persistence)
 *
 * **設計原則**:
 * - 消除 Repository 間的程式碼重複
 * - 提供統一的事件處理流程
 * - 支援 ORM 無關的資料轉換
 *
 * @abstract
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IEventStore } from '@/Foundation/Infrastructure/Ports/Database/IEventStore'
import type { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import type { IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import { OptimisticLockException } from '@/Foundation/Application/OptimisticLockException'

/**
 * Event Sourcing 基底 Repository 抽象類別
 *
 * 子類需要實作以下方法：
 * - `getTableName()`: 回傳資料表名稱
 * - `toDomain(row)`: 資料庫行 → Domain Entity
 * - `toRow(entity)`: Domain Entity → 資料庫行
 * - `toIntegrationEvent(event)`: 領域事件 → 整合事件 (ACL)
 *
 * @abstract
 * @template T 聚合根型別（必須繼承 AggregateRoot）
 */
export abstract class BaseEventSourcedRepository<T extends AggregateRoot> {
	/**
	 * 建構子
	 *
	 * @param db - 資料庫存取介面實例 (Port)
	 * @param eventDispatcher - 領域事件分發器實例（可選）
	 * @param eventStore - 事件存儲實例（可選）
	 */
	constructor(
		protected readonly db: IDatabaseAccess,
		protected readonly eventDispatcher?: IEventDispatcher,
		protected readonly eventStore?: IEventStore
	) {}

	// ============================================
	// 基礎 CRUD 操作
	// ============================================

	/**
	 * 保存聚合根 (新增或更新)
	 * 支援樂觀鎖版本控制與事件存儲
	 *
	 * **流程**:
	 * 1. 在事務中：樂觀鎖檢查、版本更新、事件存儲持久化 (原子操作)
	 * 2. 事務外：領域/整合事件分派 (DB 已提交後才發事件，防止「事件已發但 DB 回滾」)
	 * 3. 標記事件已提交
	 *
	 * @param entity - 聚合根實例
	 * @throws OptimisticLockException - 版本衝突時拋出
	 * @returns Promise<void>
	 * @public
	 */
	async save(entity: T): Promise<void> {
		const row = this.toRow(entity)
		const tableName = this.getTableName()

		// 🔹 事務內：讀取、驗證、更新（原子性操作，失敗時回滾）
		await this.db.transaction(async (trx) => {
			const existing = await trx.table(tableName).where('id', '=', entity.id).first()

			if (existing) {
				// === 更新現有實體（使用樂觀鎖）===
				const currentVersion = (existing.version as number) ?? 0
				const newVersion = currentVersion + 1

				// 驗證版本衝突：檢查是否還有符合舊版本條件的記錄
				const beforeUpdate = await trx
					.table(tableName)
					.where('id', '=', entity.id)
					.where('version', '=', currentVersion)
					.first()

				if (!beforeUpdate) {
					// 版本不匹配，表示已被其他操作更新
					throw new OptimisticLockException(this.getAggregateTypeName(), entity.id, currentVersion)
				}

				// 條件更新：WHERE id = ? AND version = ?
				await trx
					.table(tableName)
					.where('id', '=', entity.id)
					.where('version', '=', currentVersion)
					.update({ ...row, version: newVersion })
			} else {
				// === 新增實體，初始版本為 0 ===
				await trx.table(tableName).insert({ ...row, version: 0 })
			}

			// ✨ 若注入了事件存儲，在事務內先持久化事件
			if (this.eventStore) {
				await this.persistEventsToStore(entity)
			}
		})

		// 🔹 事務外：DB 已提交後才分派事件
		// 優勢：即使事件分派失敗，DB 狀態仍已保存
		if (this.eventDispatcher) {
			await this.dispatchEvents(entity)
		}

		// 標記事件已提交
		entity.markEventsAsCommitted()
	}

	/**
	 * 根據 ID 查詢實體
	 *
	 * @param id - 實體唯一識別碼
	 * @returns Promise 包含實體或 null（若找不到）
	 * @public
	 */
	async findById(id: string): Promise<T | null> {
		const row = await this.db.table(this.getTableName()).where('id', '=', id).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 刪除實體
	 *
	 * @param id - 實體唯一識別碼
	 * @returns Promise<void>
	 * @public
	 */
	async delete(id: string): Promise<void> {
		await this.db.table(this.getTableName()).where('id', '=', id).delete()
	}

	/**
	 * 查詢所有實體（支援分頁）
	 *
	 * @param params - 查詢參數，包含 limit 與 offset
	 * @returns Promise 包含實體陣列
	 * @public
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<T[]> {
		let query = this.db.table(this.getTableName())
		if (params?.offset) query = query.offset(params.offset)
		if (params?.limit) query = query.limit(params.limit)
		const rows = await query.select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 計算實體總數
	 *
	 * @returns Promise 包含實體總數
	 * @public
	 */
	async count(): Promise<number> {
		return this.db.table(this.getTableName()).count()
	}

	// ============================================
	// 抽象方法（子類必須實作）
	// ============================================

	/**
	 * 取得資料表名稱
	 *
	 * @abstract
	 * @returns 資料表名稱
	 * @protected
	 */
	protected abstract getTableName(): string

	/**
	 * 取得聚合根型別名稱（用於異常訊息）
	 *
	 * @abstract
	 * @returns 聚合根型別名稱（如 'User', 'Post'）
	 * @protected
	 */
	protected abstract getAggregateTypeName(): string

	/**
	 * 將資料庫行轉換為領域實體
	 *
	 * @abstract
	 * @param row - 資料庫行資料
	 * @returns 領域實體
	 * @protected
	 */
	protected abstract toDomain(row: any): T

	/**
	 * 將領域實體轉換為資料庫行格式
	 *
	 * @abstract
	 * @param entity - 領域實體
	 * @returns 資料庫行格式
	 * @protected
	 */
	protected abstract toRow(entity: T): Record<string, unknown>

	/**
	 * 將領域事件轉換為整合事件 (Anti-Corruption Layer)
	 *
	 * @abstract
	 * @param event - 領域事件
	 * @returns 整合事件
	 * @protected
	 */
	protected abstract toIntegrationEvent(event: DomainEvent): IntegrationEvent | null

	// ============================================
	// 受保護的輔助方法
	// ============================================

	/**
	 * 分派領域事件和轉換後的整合事件
	 *
	 * @param entity - 聚合根實例
	 * @returns Promise<void>
	 * @protected
	 */
	protected async dispatchEvents(entity: T): Promise<void> {
		const domainEvents = entity.getUncommittedEvents()

		if (domainEvents.length === 0) {
			return
		}

		// 轉換領域事件為整合事件
		const integrationEvents = domainEvents
			.map((event) => this.toIntegrationEvent(event))
			.filter((event) => event !== null) as IntegrationEvent[]

		// 同時分派領域事件和整合事件
		await this.eventDispatcher!.dispatch([...domainEvents, ...integrationEvents])
	}

	/**
	 * 將未提交事件持久化到 EventStore
	 *
	 * @param entity - 聚合根實例
	 * @returns Promise<void>
	 * @protected
	 */
	protected async persistEventsToStore(entity: T): Promise<void> {
		const domainEvents = entity.getUncommittedEvents()

		if (domainEvents.length === 0) {
			return
		}

		const currentCount = await this.eventStore!.countByAggregateId(entity.id)

		const storedEvents = domainEvents.map((event, index) => ({
			id: crypto.randomUUID(),
			eventId: event.eventId,
			aggregateId: entity.id,
			aggregateType: this.getAggregateTypeName(),
			eventType: event.constructor.name,
			eventData: JSON.stringify(event.toJSON()),
			eventVersion: 1,
			aggregateVersion: currentCount + index + 1,
			occurredAt: event.occurredAt.toISOString(),
		}))

		await this.eventStore!.append(storedEvents)
	}
}
