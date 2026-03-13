/**
 * 支付狀態值物件 - 狀態機: Initiated → (Succeeded | Failed)
 */
export type PaymentStatusType = 'INITIATED' | 'SUCCEEDED' | 'FAILED'

export class PaymentStatus {
	private readonly _status: PaymentStatusType

	constructor(status: PaymentStatusType) {
		this._status = status
	}

	get value(): PaymentStatusType {
		return this._status
	}

	static initiated(): PaymentStatus {
		return new PaymentStatus('INITIATED')
	}

	static succeeded(): PaymentStatus {
		return new PaymentStatus('SUCCEEDED')
	}

	static failed(): PaymentStatus {
		return new PaymentStatus('FAILED')
	}

	static from(value: string): PaymentStatus {
		const status = value.toUpperCase() as PaymentStatusType
		const validStatuses: PaymentStatusType[] = ['INITIATED', 'SUCCEEDED', 'FAILED']

		if (!validStatuses.includes(status)) {
			throw new Error(`無效的支付狀態: ${value}`)
		}
		return new PaymentStatus(status)
	}

	isInitiated(): boolean {
		return this._status === 'INITIATED'
	}

	isSucceeded(): boolean {
		return this._status === 'SUCCEEDED'
	}

	isFailed(): boolean {
		return this._status === 'FAILED'
	}

	/**
	 * 驗證狀態轉換是否有效
	 */
	canTransitionTo(newStatus: PaymentStatus): boolean {
		// Initiated 可轉換到 Succeeded 或 Failed
		if (this._status === 'INITIATED') {
			return newStatus.isSucceeded() || newStatus.isFailed()
		}
		// Succeeded 和 Failed 不可再轉換
		return false
	}

	equals(other: PaymentStatus): boolean {
		return this._status === other._status
	}

	toString(): string {
		const labels: Record<PaymentStatusType, string> = {
			'INITIATED': '待支付',
			'SUCCEEDED': '已支付',
			'FAILED': '支付失敗'
		}
		return labels[this._status]
	}
}
