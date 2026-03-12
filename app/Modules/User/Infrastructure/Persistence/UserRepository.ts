/**
 * @file UserRepository.ts
 * @description 用戶資料倉儲實現 (ORM 無關)
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作領域層定義的 Repository 介面。
 * - 職責：處理 User 實體與底層持久化存儲之間的轉換與操作。
 *
 * @internal - 此實現是基礎設施層細節，應通過 IUserRepository 使用
 *
 * 設計：
 * - 依賴 IDatabaseAccess（由上層注入；無 DB 時上層注入 MemoryDatabaseAccess）
 * - 完全實現 IRepository<User> 契約
 * - 支援基本 CRUD 操作與業務查詢（findByEmail）
 * - 不知道底層是真實 DB 或內存（完全透過 IDatabaseAccess 抽象）
 *
 * 架構優勢：
 * ✅ 單一 Repository 實現，無 if (db) 分支
 * ✅ 內存/數據庫由上層處理，底層僅依賴 Port
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'
import type { IEventStore } from '@/Shared/Infrastructure/IEventStore'
import { toIntegrationEvent, type IntegrationEvent } from '@/Shared/Domain/IntegrationEvent'
import { User } from '../../Domain/Aggregates/User'
import { Email } from '../../Domain/ValueObjects/Email'
import { UserName } from '../../Domain/ValueObjects/UserName'
import { UserCreated } from '../../Domain/Events/UserCreated'
import { UserNameChanged } from '../../Domain/Events/UserNameChanged'
import { UserEmailChanged } from '../../Domain/Events/UserEmailChanged'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { OptimisticLockException } from '@/Shared/Application/OptimisticLockException'

/**
 * 用戶倉儲類別，封裝所有用戶相關的資料存取邏輯
 */
export class UserRepository implements IUserRepository {
	/**
	 * 建構子
	 * @param db - 資料庫存取介面實例
	 * @param eventDispatcher - 領域事件分發器實例
	 * @param eventStore - 事件存儲實例（選擇性）
	 */
	constructor(
		private readonly db: IDatabaseAccess,
		private readonly eventDispatcher?: IEventDispatcher,
		private readonly eventStore?: IEventStore
	) {}

	// ============================================
	// 基礎 CRUD 操作（實現 IRepository<User>）
	// ============================================

	/**
	 * 保存用戶（新增或更新）
	 * 支援樂觀鎖版本控制與事件存儲
	 *
	 * @param user - User 領域實體
	 * @throws OptimisticLockException - 版本衝突時拋出
	 * @returns 非同步作業
	 */
	async save(user: User): Promise<void> {
		const row = this.toRow(user)
		const existing = await this.db.table('users').where('id', '=', user.id).first()

		if (existing) {
			// 更新現有用戶（使用樂觀鎖）
			const currentVersion = (existing.version as number) ?? 0
			const newVersion = currentVersion + 1

			// 驗證版本衝突：檢查是否還有符合舊版本條件的記錄
			const beforeUpdate = await this.db
				.table('users')
				.where('id', '=', user.id)
				.where('version', '=', currentVersion)
				.first()

			if (!beforeUpdate) {
				// 版本不匹配，表示已被其他操作更新
				throw new OptimisticLockException('User', user.id, currentVersion)
			}

			// 條件更新：WHERE id = ? AND version = ?
			await this.db
				.table('users')
				.where('id', '=', user.id)
				.where('version', '=', currentVersion)
				.update({ ...row, version: newVersion })
		} else {
			// 新增用戶，初始版本為 0
			await this.db.table('users').insert({ ...row, version: 0 })
		}

		// ✨ 若注入了分發器，則分發事件
		if (this.eventDispatcher) {
			const domainEvents = user.getUncommittedEvents()

			// 同時分派領域事件和轉換後的整合事件
			const integrationEvents = domainEvents.map(event => this.toIntegrationEvent(event))

			await this.eventDispatcher.dispatch([...domainEvents, ...integrationEvents])
			user.markEventsAsCommitted()
		}

		// ✨ 若注入了事件存儲，則持久化事件
		if (this.eventStore && user.getUncommittedEvents().length > 0) {
			const currentCount = await this.eventStore.countByAggregateId(user.id)
			const domainEvents = user.getUncommittedEvents()

			const storedEvents = domainEvents.map((event, index) => ({
				id: crypto.randomUUID(),
				eventId: event.eventId,
				aggregateId: user.id,
				aggregateType: 'User',
				eventType: event.constructor.name,
				eventData: JSON.stringify(event.toJSON()),
				eventVersion: 1,
				aggregateVersion: currentCount + index + 1,
				occurredAt: event.occurredAt.toISOString(),
			}))

			await this.eventStore.append(storedEvents)
		}
	}

	/**
	 * 將領域事件轉換為整合事件 (ACL)
	 * 這是跨 Bounded Context 邊界的轉換層
	 *
	 * @param event - 領域事件
	 * @returns 整合事件
	 * @private
	 */
	private toIntegrationEvent(event: any): IntegrationEvent {
		if (event instanceof UserCreated) {
			return toIntegrationEvent(
				'UserCreated',
				'User', // 來源 Bounded Context
				{
					userId: event.userId,
					name: event.name,
					email: event.email,
					createdAt: event.createdAt.toISOString(),
				},
				event.userId
			)
		} else if (event instanceof UserNameChanged) {
			return toIntegrationEvent(
				'UserNameChanged',
				'User',
				{
					userId: event.userId,
					newName: event.newName,
				},
				event.userId
			)
		} else if (event instanceof UserEmailChanged) {
			return toIntegrationEvent(
				'UserEmailChanged',
				'User',
				{
					userId: event.userId,
					newEmail: event.newEmail,
				},
				event.userId
			)
		}
		// 若有其他事件型別，可在此添加轉換邏輯
		throw new Error(`不支援的領域事件型別：${event.constructor.name}`)
	}

	/**
	 * 根據 ID 查詢用戶
	 *
	 * @param id - 用戶唯一識別碼
	 * @returns 回傳 User 實體，若找不到則回傳 null
	 */
	async findById(id: string): Promise<User | null> {
		const row = await this.db.table('users').where('id', '=', id).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 刪除用戶
	 *
	 * @param id - 用戶唯一識別碼
	 * @returns 非同步作業
	 */
	async delete(id: string): Promise<void> {
		await this.db.table('users').where('id', '=', id).delete()
	}

	/**
	 * 查詢所有用戶（支援分頁）
	 *
	 * @param params - 查詢參數，包含限制數量 (limit) 與位移量 (offset)
	 * @returns 回傳符合條件的 User 實體陣列
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<User[]> {
		let query = this.db.table('users')
		if (params?.offset) query = query.offset(params.offset)
		if (params?.limit) query = query.limit(params.limit)
		const rows = await query.select()
		return rows.map((row) => this.toDomain(row))
	}

	/**
	 * 計算系統中用戶的總數
	 *
	 * @returns 回傳用戶總數
	 */
	async count(): Promise<number> {
		return this.db.table('users').count()
	}

	// ============================================
	// 業務相關方法（實現 IUserRepository）
	// ============================================

	/**
	 * 按電子郵件查詢用戶
	 *
	 * @param email - Email ValueObject
	 * @returns 回傳 User 實體，若找不到則回傳 null
	 */
	async findByEmail(email: Email): Promise<User | null> {
		const row = await this.db.table('users').where('email', '=', email.value).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 列出所有用戶（已棄用，使用 findAll() 代替）
	 * @deprecated 使用 findAll() 代替
	 * @returns 回傳所有 User 實體陣列
	 */
	async list(): Promise<User[]> {
		return this.findAll()
	}

	// ============================================
	// 輔助方法
	// ============================================

	/**
	 * 將資料庫記錄 (Persistence Object) 轉換為領域實體 (Domain Entity)
	 *
	 * @param row - 資料庫回傳的原始資料
	 * @returns 轉換後的領域實體
	 * @private
	 */
	private toDomain(row: any): User {
		const email = Email.create(row.email as string)
		const name = UserName.create(row.name as string)
		const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string)

		return User.reconstitute(row.id as string, name, email, createdAt)
	}

	/**
	 * 將領域實體 (Domain Entity) 轉換為資料庫記錄 (Persistence Object)
	 *
	 * @param user - User 領域實體
	 * @returns 資料庫對應的純物件記錄
	 * @private
	 */
	private toRow(user: User): Record<string, unknown> {
		return {
			id: user.id,
			name: user.name.value,
			email: user.email.value,
			created_at: user.createdAt.toISOString(),
			updated_at: new Date().toISOString(),
		}
	}
}
