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
 * - 繼承 BaseEventSourcedRepository，消除程式碼重複
 * - 依賴 IDatabaseAccess（由上層注入；無 DB 時上層注入 MemoryDatabaseAccess）
 * - 完全實現 IRepository<User> 契約
 * - 支援基本 CRUD 操作與業務查詢（findByEmail）
 * - 不知道底層是真實 DB 或內存（完全透過 IDatabaseAccess 抽象）
 *
 * 架構優勢：
 * ✅ 單一 Repository 實現，無 if (db) 分支
 * ✅ 內存/數據庫由上層處理，底層僅依賴 Port
 * ✅ 樂觀鎖、事件分派、EventStore 邏輯統一由基底類別管理
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'
import type { IEventStore } from '@/Shared/Infrastructure/IEventStore'
import { BaseEventSourcedRepository } from '@/Shared/Infrastructure/Database/Repositories/BaseEventSourcedRepository'
import { toIntegrationEvent, type IntegrationEvent } from '@/Shared/Domain/IntegrationEvent'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { User } from '../../Domain/Aggregates/User'
import { Email } from '../../Domain/ValueObjects/Email'
import { UserName } from '../../Domain/ValueObjects/UserName'
import { UserCreated } from '../../Domain/Events/UserCreated'
import { UserNameChanged } from '../../Domain/Events/UserNameChanged'
import { UserEmailChanged } from '../../Domain/Events/UserEmailChanged'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

/**
 * 用戶倉儲類別，封裝所有用戶相關的資料存取邏輯
 *
 * 繼承 BaseEventSourcedRepository，享受統一的：
 * - 樂觀鎖版本控制邏輯
 * - 領域/整合事件分派
 * - EventStore 持久化
 */
export class UserRepository extends BaseEventSourcedRepository<User> implements IUserRepository {
	/**
	 * 建構子
	 * @param db - 資料庫存取介面實例
	 * @param eventDispatcher - 領域事件分發器實例
	 * @param eventStore - 事件存儲實例（選擇性）
	 */
	constructor(
		db: IDatabaseAccess,
		eventDispatcher?: IEventDispatcher,
		eventStore?: IEventStore
	) {
		super(db, eventDispatcher, eventStore)
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
		const row = await this.db.table(this.getTableName()).where('email', '=', email.value).first()
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
	// 實作抽象方法
	// ============================================

	/**
	 * 取得資料表名稱
	 * @protected
	 */
	protected getTableName(): string {
		return 'users'
	}

	/**
	 * 取得聚合根型別名稱
	 * @protected
	 */
	protected getAggregateTypeName(): string {
		return 'User'
	}

	/**
	 * 將資料庫記錄 (Persistence Object) 轉換為領域實體 (Domain Entity)
	 *
	 * @param row - 資料庫回傳的原始資料
	 * @returns 轉換後的領域實體
	 * @protected
	 */
	protected toDomain(row: any): User {
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
	 * @protected
	 */
	protected toRow(user: User): Record<string, unknown> {
		return {
			id: user.id,
			name: user.name.value,
			email: user.email.value,
			created_at: user.createdAt.toISOString(),
			updated_at: new Date().toISOString(),
		}
	}

	/**
	 * 將領域事件轉換為整合事件 (ACL)
	 * 這是跨 Bounded Context 邊界的轉換層
	 *
	 * @param event - 領域事件
	 * @returns 整合事件，若不支援則回傳 null
	 * @protected
	 */
	protected toIntegrationEvent(event: DomainEvent): IntegrationEvent | null {
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
		}

		if (event instanceof UserNameChanged) {
			return toIntegrationEvent(
				'UserNameChanged',
				'User',
				{
					userId: event.userId,
					newName: event.newName,
				},
				event.userId
			)
		}

		if (event instanceof UserEmailChanged) {
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
		// 目前不支援的事件型別回傳 null，由基底類別過濾
		return null
	}
}
