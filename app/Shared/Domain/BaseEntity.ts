/**
 * 基礎實體 - DDD 聚合根基底類別
 *
 * @module BaseEntity
 * @description 所有 Domain Entity 應繼承此類別，提供：
 * - ID 管理
 * - 時間戳（建立、修改）
 * - 相等性判斷
 *
 * **DDD 角色**
 * - 核心：Entity（實體）
 * - 職責：代表具備唯一識別碼（Identity）的領域對象。
 */

/**
 * 基礎實體抽象類別
 *
 * @abstract
 */
export abstract class BaseEntity {
	/** 實體唯一識別碼（子類可覆寫 getter 以回傳自有 props） */
	protected _id: string
	/** 建立時間（子類可覆寫 getter） */
	protected _createdAt: Date
	/** 最後更新時間 */
	protected _updatedAt: Date

	constructor(id?: string) {
		this._id = id || crypto.randomUUID()
		this._createdAt = new Date()
		this._updatedAt = new Date()
	}

	/** 取得實體 ID（子類可 override 以回傳 props.id） */
	get id(): string {
		return this._id
	}

	/** 取得建立時間（子類可 override 以回傳 props.createdAt） */
	get createdAt(): Date {
		return this._createdAt
	}

	/** 取得最後更新時間 */
	get updatedAt(): Date {
		return this._updatedAt
	}

	getId(): string {
		return this.id
	}

	getCreatedAt(): Date {
		return this.createdAt
	}

	getUpdatedAt(): Date {
		return this.updatedAt
	}

	equals(other: BaseEntity): boolean {
		return this.id === other.id
	}

	toString(): string {
		return `${this.constructor.name}(${this.id})`
	}
}
