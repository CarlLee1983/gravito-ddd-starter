import { ValueObject } from '@/Foundation/Domain/ValueObject'

type DecisionType = 'auto' | 'manual'

interface PolicyDecisionProps extends Record<string, unknown> {
	readonly type: DecisionType
	readonly rule: string | null
	readonly reviewerId: string | null
	readonly note: string | null
}

/**
 * 政策決策值物件 — 表示自動或人工審核的決定
 */
export class PolicyDecision extends ValueObject<PolicyDecisionProps> {
	private constructor(props: PolicyDecisionProps) {
		super(props)
	}

	/** 自動審核決定 */
	static auto(rule: string): PolicyDecision {
		return new PolicyDecision({
			type: 'auto',
			rule,
			reviewerId: null,
			note: null,
		})
	}

	/** 人工審核決定 */
	static manual(reviewerId: string, note: string | null): PolicyDecision {
		return new PolicyDecision({
			type: 'manual',
			rule: null,
			reviewerId,
			note,
		})
	}

	get type(): DecisionType {
		return this.props.type
	}

	get rule(): string | null {
		return this.props.rule
	}

	get reviewerId(): string | null {
		return this.props.reviewerId
	}

	get note(): string | null {
		return this.props.note
	}

	isAuto(): boolean {
		return this.props.type === 'auto'
	}

	isManual(): boolean {
		return this.props.type === 'manual'
	}

	toString(): string {
		if (this.isAuto()) {
			return `PolicyDecision(auto, rule=${this.props.rule})`
		}
		return `PolicyDecision(manual, reviewerId=${this.props.reviewerId})`
	}
}
