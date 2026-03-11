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
	/** 實體唯一識別碼 */
	protected id: string
	/** 建立時間 */
	protected createdAt: Date
	/** 最後更新時間 */
	protected updatedAt: Date

	/**
	 * 建構子
	 *
	 * @param {string} [id] - 可選的初始 ID，若不提供則自動生成 UUID
	 */
	constructor(id?: string) {
		this.id = id || crypto.randomUUID()
		this.createdAt = new Date()
		this.updatedAt = new Date()
	}

	/**
	 * 取得實體 ID
	 *
	 * @returns {string} 實體 ID
	 */
	getId(): string {
		return this.id
	}

	/**
	 * 取得建立時間
	 *
	 * @returns {Date} 建立時間
	 */
	getCreatedAt(): Date {
		return this.createdAt
	}

	/**
	 * 取得最後更新時間
	 *
	 * @returns {Date} 最後更新時間
	 */
	getUpdatedAt(): Date {
		return this.updatedAt
	}

	/**
	 * 設定更新時間
	 *
	 * @param {Date} date - 更新時間
	 * @returns {void}
	 */
	setUpdatedAt(date: Date): void {
		this.updatedAt = date
	}

	/**
	 * 比較兩個實體是否相同（基於 ID）
	 *
	 * @param {BaseEntity} other - 要比較的另一個實體
	 * @returns {boolean} 是否相等
	 */
	equals(other: BaseEntity): boolean {
		return this.id === other.id
	}

	/**
	 * 實體的字串表示
	 *
	 * @returns {string} 實體字串描述
	 */
	toString(): string {
		return `${this.constructor.name}(${this.id})`
	}
}
