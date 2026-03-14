/**
 * @file PostRepository.ts
 * @description 實現 Post 模組的資料倉儲 (Repository)
 *
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」，實現了領域層定義的 IPostRepository 介面。
 * 負責將領域物件 (Domain Entity/Aggregate) 轉換為資料層可理解的格式並進行持久化操作。
 *
 * Phase 3 改造：
 * - 使用 Post.reconstitute() 而非 fromDatabase()
 * - 提取 ValueObject 值進行持久化
 * - 完整事件分派機制
 *
 * Phase 4 改造：
 * - 繼承 BaseEventSourcedRepository，消除重複的樂觀鎖/事件邏輯
 * - 修正 EventStore 寫入 Bug (EventStore 應在 markEventsAsCommitted() 前執行)
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IEventStore } from '@/Foundation/Infrastructure/Ports/Database/IEventStore'
import { BaseEventSourcedRepository } from '@/Foundation/Infrastructure/Database/Repositories/BaseEventSourcedRepository'
import { toIntegrationEvent, type IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { Post } from '../../Domain/Aggregates/Post'
import { Title } from '../../Domain/ValueObjects/Title'
import { Content } from '../../Domain/ValueObjects/Content'
import { PostCreated } from '../../Domain/Events/PostCreated'
import { PostPublished } from '../../Domain/Events/PostPublished'
import { PostArchived } from '../../Domain/Events/PostArchived'
import { PostTitleChanged } from '../../Domain/Events/PostTitleChanged'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'

/**
 * PostRepository 類別
 *
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」。
 * 責負將領域聚合根與資料庫之間的轉換與操作。
 *
 * 繼承 BaseEventSourcedRepository，享受統一的：
 * - 樂觀鎖版本控制邏輯
 * - 領域/整合事件分派
 * - EventStore 持久化 (修正 Bug: EventStore 先於 markEventsAsCommitted())
 */
export class PostRepository extends BaseEventSourcedRepository<Post> implements IPostRepository {
	/**
	 * 建立 PostRepository 實例
	 *
	 * @param db - 資料庫存取介面實例 (Port)
	 * @param eventDispatcher - 領域事件分發器實例（可選）
	 * @param eventStore - 事件存儲實例（可選）
	 */
	constructor(
		db: IDatabaseAccess,
		eventDispatcher?: IEventDispatcher,
		eventStore?: IEventStore
	) {
		super(db, eventDispatcher, eventStore)
	}

	// ============================================
	// 業務相關方法（實現 IPostRepository）
	// ============================================

	/**
	 * 根據標題查找文章
	 *
	 * @param title - Title ValueObject
	 * @returns 找到的 Post 聚合根或 null
	 */
	async findByTitle(title: Title): Promise<Post | null> {
		const row = await this.db.table(this.getTableName()).where('title', '=', title.value).first()
		return row ? this.toDomain(row) : null
	}

	/**
	 * 獲取特定作者的所有文章
	 *
	 * @param authorId - 作者 ID
	 * @returns 該作者的文章列表
	 */
	async findByAuthor(authorId: string): Promise<Post[]> {
		const rows = await this.db.table(this.getTableName()).where('author_id', '=', authorId).select()
		return rows.map((row) => this.toDomain(row))
	}

	// ============================================
	// 實作抽象方法
	// ============================================

	/**
	 * 取得資料表名稱
	 * @protected
	 */
	protected getTableName(): string {
		return 'posts'
	}

	/**
	 * 取得聚合根型別名稱
	 * @protected
	 */
	protected getAggregateTypeName(): string {
		return 'Post'
	}

	/**
	 * 將資料庫行轉換為 Domain Object
	 *
	 * @param row - 資料庫中的原始資料行
	 * @returns 轉換後的領域聚合根
	 * @protected
	 */
	protected toDomain(row: any): Post {
		const title = Title.create(row.title as string)
		const content = Content.create(row.content as string)
		const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string)
		const isPublished = row.is_published === 1 || row.is_published === true
		const isArchived = row.is_archived === 1 || row.is_archived === true

		return Post.reconstitute(
			row.id as string,
			title,
			content,
			row.author_id as string,
			createdAt,
			isPublished,
			isArchived
		)
	}

	/**
	 * 將 Domain Object 轉換為資料庫行格式
	 *
	 * @param post - Domain Entity 聚合根
	 * @returns 符合資料庫結構的資料行對象
	 * @protected
	 */
	protected toRow(post: Post): Record<string, unknown> {
		return {
			id: post.id,
			title: post.title.value,
			content: post.content.value,
			author_id: post.authorId,
			is_published: post.isPublished ? 1 : 0,
			is_archived: post.isArchived ? 1 : 0,
			created_at: post.createdAt.toISOString(),
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
		if (event instanceof PostCreated) {
			return toIntegrationEvent(
				'PostCreated',
				'Post', // 來源 Bounded Context
				{
					postId: event.postId,
					title: event.title,
					content: event.content,
					authorId: event.authorId,
					createdAt: event.createdAt.toISOString(),
				},
				event.postId
			)
		}

		if (event instanceof PostPublished) {
			return toIntegrationEvent(
				'PostPublished',
				'Post',
				{
					postId: event.postId,
					authorId: event.authorId,
					publishedAt: event.occurredAt.toISOString(),
				},
				event.postId
			)
		}

		if (event instanceof PostArchived) {
			return toIntegrationEvent(
				'PostArchived',
				'Post',
				{
					postId: event.postId,
					authorId: event.authorId,
					archivedAt: event.occurredAt.toISOString(),
				},
				event.postId
			)
		}

		if (event instanceof PostTitleChanged) {
			return toIntegrationEvent(
				'PostTitleChanged',
				'Post',
				{
					postId: event.postId,
					oldTitle: event.oldTitle,
					newTitle: event.newTitle,
				},
				event.postId
			)
		}

		// 不支援的事件型別回傳 null，由基底類別過濾
		return null
	}
}
