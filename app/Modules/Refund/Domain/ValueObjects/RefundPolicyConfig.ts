import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface RefundPolicyConfigProps extends Record<string, unknown> {
	readonly maxAutoApprovalDays: number
	readonly maxAutoApprovalAmountCents: number
	readonly maxAutoApprovalAmountCurrency: string
	readonly maxRecentRefunds: number
	readonly recentRefundWindowDays: number
	readonly autoApprovalReasons: readonly string[]
}

interface RefundPolicyConfigParams {
	maxAutoApprovalDays?: number
	maxAutoApprovalAmountCents?: number
	maxAutoApprovalAmountCurrency?: string
	maxRecentRefunds?: number
	recentRefundWindowDays?: number
	autoApprovalReasons?: string[]
}

/**
 * 退款政策設定值物件 — 定義自動核准規則與限制
 */
export class RefundPolicyConfig extends ValueObject<RefundPolicyConfigProps> {
	private constructor(props: RefundPolicyConfigProps) {
		super(props)
	}

	static create(params?: RefundPolicyConfigParams): RefundPolicyConfig {
		const {
			maxAutoApprovalDays = 7,
			maxAutoApprovalAmountCents = 10000,
			maxAutoApprovalAmountCurrency = 'TWD',
			maxRecentRefunds = 3,
			recentRefundWindowDays = 30,
			autoApprovalReasons = ['defective', 'wrong_item', 'not_as_described', 'change_of_mind'],
		} = params ?? {}

		return new RefundPolicyConfig({
			maxAutoApprovalDays,
			maxAutoApprovalAmountCents,
			maxAutoApprovalAmountCurrency,
			maxRecentRefunds,
			recentRefundWindowDays,
			autoApprovalReasons: Object.freeze([...autoApprovalReasons]),
		})
	}

	/** 建立預設政策設定 */
	static defaults(): RefundPolicyConfig {
		return RefundPolicyConfig.create({})
	}

	get maxAutoApprovalDays(): number {
		return this.props.maxAutoApprovalDays
	}

	get maxAutoApprovalAmountCents(): number {
		return this.props.maxAutoApprovalAmountCents
	}

	get maxAutoApprovalAmountCurrency(): string {
		return this.props.maxAutoApprovalAmountCurrency
	}

	get maxRecentRefunds(): number {
		return this.props.maxRecentRefunds
	}

	get recentRefundWindowDays(): number {
		return this.props.recentRefundWindowDays
	}

	get autoApprovalReasons(): readonly string[] {
		return this.props.autoApprovalReasons
	}

	toString(): string {
		return `RefundPolicyConfig(maxDays=${this.props.maxAutoApprovalDays}, maxAmount=${this.props.maxAutoApprovalAmountCurrency} ${this.props.maxAutoApprovalAmountCents})`
	}
}
