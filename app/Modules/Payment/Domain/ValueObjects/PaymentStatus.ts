/**
 * @file PaymentStatus.ts
 * @description 支付狀態值物件，實作支付狀態機邏輯
 */

/**
 * 支付狀態枚舉類型
 * Initiated: 已發起/待支付
 * Succeeded: 支付成功
 * Failed: 支付失敗
 */
export type PaymentStatusType = 'INITIATED' | 'SUCCEEDED' | 'FAILED'

/**
 * 支付狀態值物件 - 狀態機: Initiated → (Succeeded | Failed)
 */
export class PaymentStatus {
	private readonly _status: PaymentStatusType

	/**
	 * @param status - 支付狀態類型
	 */
	constructor(status: PaymentStatusType) {
		this._status = status
	}

	/** 獲取狀態原始值 */
	get value(): PaymentStatusType {
		return this._status
	}

	/**
	 * 建立「已發起」狀態
	 *
	 * @returns 支付狀態實例
	 */
	static initiated(): PaymentStatus {
		return new PaymentStatus('INITIATED')
	}

	/**
	 * 建立「支付成功」狀態
	 *
	 * @returns 支付狀態實例
	 */
	static succeeded(): PaymentStatus {
		return new PaymentStatus('SUCCEEDED')
	}

	/**
	 * 建立「支付失敗」狀態
	 *
	 * @returns 支付狀態實例
	 */
	static failed(): PaymentStatus {
		return new PaymentStatus('FAILED')
	}

	/**
	 * 從字串建立支付狀態
	 *
	 * @param value - 狀態字串
	 * @returns 支付狀態實例
	 * @throws Error 當字串不是有效的支付狀態時
	 */
	static from(value: string): PaymentStatus {
		const status = value.toUpperCase() as PaymentStatusType
		const validStatuses: PaymentStatusType[] = ['INITIATED', 'SUCCEEDED', 'FAILED']

		if (!validStatuses.includes(status)) {
			throw new Error(`無效的支付狀態: ${value}`)
		}
		return new PaymentStatus(status)
	}

	/** 檢查是否為已發起狀態 */
	isInitiated(): boolean {
		return this._status === 'INITIATED'
	}

	/** 檢查是否為成功狀態 */
	isSucceeded(): boolean {
		return this._status === 'SUCCEEDED'
	}

	/** 檢查是否為失敗狀態 */
	isFailed(): boolean {
		return this._status === 'FAILED'
	}

	/**
	 * 驗證狀態轉換是否有效
	 *
	 * @param newStatus - 目標狀態
	 * @returns 是否允許轉換
	 */
	canTransitionTo(newStatus: PaymentStatus): boolean {
		// Initiated 可轉換到 Succeeded 或 Failed
		if (this._status === 'INITIATED') {
			return newStatus.isSucceeded() || newStatus.isFailed()
		}
		// Succeeded 和 Failed 不可再轉換
		return false
	}

	/**
	 * 檢查兩個狀態是否相等
	 *
	 * @param other - 另一個狀態值物件
	 * @returns 是否相等
	 */
	equals(other: PaymentStatus): boolean {
		return this._status === other._status
	}

	/**
	 * 轉換為可讀字串（繁體中文）
	 *
	 * @returns 狀態名稱
	 */
	toString(): string {
		const labels: Record<PaymentStatusType, string> = {
			'INITIATED': '待支付',
			'SUCCEEDED': '已支付',
			'FAILED': '支付失敗'
		}
		return labels[this._status]
	}
}
