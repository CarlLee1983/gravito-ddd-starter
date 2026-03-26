import { ValueObject } from '@/Foundation/Domain/ValueObject'

export type RefundStatusValue =
	| 'requested'
	| 'under_review'
	| 'approved'
	| 'rejected'
	| 'awaiting_return'
	| 'items_received'
	| 'processing'
	| 'completed'
	| 'failed'

const VALID_STATUSES = new Set<string>([
	'requested',
	'under_review',
	'approved',
	'rejected',
	'awaiting_return',
	'items_received',
	'processing',
	'completed',
	'failed',
])

/** 狀態轉換表：key 為當前狀態，value 為允許轉換的目標狀態集合 */
const TRANSITIONS: Record<RefundStatusValue, ReadonlySet<RefundStatusValue>> = {
	requested: new Set(['under_review']),
	under_review: new Set(['approved', 'rejected']),
	approved: new Set(['awaiting_return', 'processing']),
	rejected: new Set(),
	awaiting_return: new Set(['items_received']),
	items_received: new Set(['processing']),
	processing: new Set(['completed', 'failed']),
	completed: new Set(),
	failed: new Set(['processing']),
}

const TERMINAL_STATUSES = new Set<RefundStatusValue>(['completed', 'rejected'])

interface RefundStatusProps extends Record<string, unknown> {
	readonly status: RefundStatusValue
}

/**
 * 退款狀態值物件 — 9 個狀態的完整狀態機
 */
export class RefundStatus extends ValueObject<RefundStatusProps> {
	private constructor(props: RefundStatusProps) {
		super(props)
	}

	get value(): RefundStatusValue {
		return this.props.status
	}

	/** 從字串建立，無效值拋出錯誤 */
	static from(status: string): RefundStatus {
		if (!VALID_STATUSES.has(status)) {
			throw new Error(`無效的退款狀態: "${status}"`)
		}
		return new RefundStatus({ status: status as RefundStatusValue })
	}

	static requested(): RefundStatus {
		return new RefundStatus({ status: 'requested' })
	}

	static underReview(): RefundStatus {
		return new RefundStatus({ status: 'under_review' })
	}

	static approved(): RefundStatus {
		return new RefundStatus({ status: 'approved' })
	}

	static rejected(): RefundStatus {
		return new RefundStatus({ status: 'rejected' })
	}

	static awaitingReturn(): RefundStatus {
		return new RefundStatus({ status: 'awaiting_return' })
	}

	static itemsReceived(): RefundStatus {
		return new RefundStatus({ status: 'items_received' })
	}

	static processing(): RefundStatus {
		return new RefundStatus({ status: 'processing' })
	}

	static completed(): RefundStatus {
		return new RefundStatus({ status: 'completed' })
	}

	static failed(): RefundStatus {
		return new RefundStatus({ status: 'failed' })
	}

	/** 檢查是否可以轉換至目標狀態 */
	canTransitionTo(target: RefundStatus): boolean {
		return TRANSITIONS[this.props.status].has(target.props.status)
	}

	/** 終態：completed 和 rejected 無法再轉換 */
	isTerminal(): boolean {
		return TERMINAL_STATUSES.has(this.props.status)
	}

	toString(): string {
		return this.props.status
	}
}
