# Refund 模組實施計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立完整的退貨退款模組（Refund），作為獨立 Bounded Context，透過 Saga 和 IntegrationEvent 與 Order、Payment、Inventory 協調。

**Architecture:** 單一聚合根（Refund）+ 子實體（ReturnItem）+ 豐富值物件。Domain Services 處理審核策略和金額計算。RefundSaga 協調跨模組的退款流程。使用 EventListenerRegistry 模式註冊事件監聽。

**Tech Stack:** Bun + TypeScript, bun:test, @gravito/core DI 容器, IDatabaseAccess Port, BaseEventSourcedRepository

**Spec:** `docs/superpowers/specs/2026-03-26-refund-module-design.md`

---

## Task 1: Domain Value Objects — Money、RefundId、RefundType、RefundReason、ItemCondition

**Files:**
- Create: `app/Modules/Refund/Domain/ValueObjects/Money.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundId.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundType.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundReason.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/ItemCondition.ts`
- Test: `app/Modules/Refund/tests/Unit/ValueObjects.test.ts`

- [ ] **Step 1: Write failing tests for Money value object**

```typescript
// app/Modules/Refund/tests/Unit/ValueObjects.test.ts
import { describe, it, expect } from 'bun:test'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundId } from '../../Domain/ValueObjects/RefundId'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'

describe('Money', () => {
	it('應該建立 Money（整數分）', () => {
		const money = Money.fromCents(5000, 'TWD')
		expect(money.cents).toBe(5000)
		expect(money.currency).toBe('TWD')
	})

	it('應該從元金額建立', () => {
		const money = Money.fromDollars(50, 'TWD')
		expect(money.cents).toBe(5000)
	})

	it('應該支援加法（不可變）', () => {
		const a = Money.fromCents(100, 'TWD')
		const b = Money.fromCents(200, 'TWD')
		const result = a.add(b)
		expect(result.cents).toBe(300)
		expect(a.cents).toBe(100) // 原值不變
	})

	it('應該支援減法', () => {
		const a = Money.fromCents(500, 'TWD')
		const b = Money.fromCents(200, 'TWD')
		expect(a.subtract(b).cents).toBe(300)
	})

	it('應該支援乘以比例', () => {
		const m = Money.fromCents(1000, 'TWD')
		expect(m.multiplyByRate(0.6).cents).toBe(600)
	})

	it('應該禁止不同幣別運算', () => {
		const twd = Money.fromCents(100, 'TWD')
		const usd = Money.fromCents(100, 'USD')
		expect(() => twd.add(usd)).toThrow('幣別不一致')
	})

	it('應該支援 zero 工廠', () => {
		const zero = Money.zero('TWD')
		expect(zero.cents).toBe(0)
	})

	it('應該支援相等性比較', () => {
		const a = Money.fromCents(100, 'TWD')
		const b = Money.fromCents(100, 'TWD')
		expect(a.equals(b)).toBe(true)
	})
})

describe('RefundId', () => {
	it('應該自動生成 UUID', () => {
		const id = RefundId.create()
		expect(id.value).toBeDefined()
		expect(id.value.length).toBeGreaterThan(0)
	})

	it('應該接受指定值', () => {
		const id = RefundId.from('refund-123')
		expect(id.value).toBe('refund-123')
	})
})

describe('RefundType', () => {
	it('應該建立 RefundOnly', () => {
		const t = RefundType.refundOnly()
		expect(t.value).toBe('refund_only')
		expect(t.isRefundOnly()).toBe(true)
		expect(t.isReturnAndRefund()).toBe(false)
	})

	it('應該建立 ReturnAndRefund', () => {
		const t = RefundType.returnAndRefund()
		expect(t.value).toBe('return_and_refund')
		expect(t.isReturnAndRefund()).toBe(true)
	})

	it('應該從字串建立', () => {
		const t = RefundType.from('refund_only')
		expect(t.isRefundOnly()).toBe(true)
	})

	it('應該拒絕無效類型', () => {
		expect(() => RefundType.from('invalid')).toThrow()
	})
})

describe('RefundReason', () => {
	it('應該建立預定義原因', () => {
		const r = RefundReason.defective()
		expect(r.value).toBe('defective')
	})

	it('應該建立自定義原因', () => {
		const r = RefundReason.other('尺寸不合')
		expect(r.value).toBe('other')
		expect(r.description).toBe('尺寸不合')
	})

	it('應該從字串建立', () => {
		const r = RefundReason.from('wrong_item')
		expect(r.value).toBe('wrong_item')
	})
})

describe('ItemCondition', () => {
	it('應該建立 Good / Damaged / Missing', () => {
		expect(ItemCondition.good().value).toBe('good')
		expect(ItemCondition.damaged().value).toBe('damaged')
		expect(ItemCondition.missing().value).toBe('missing')
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/ValueObjects.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement Money value object**

```typescript
// app/Modules/Refund/Domain/ValueObjects/Money.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface MoneyProps extends Record<string, unknown> {
	readonly cents: number
	readonly currency: string
}

export class Money extends ValueObject<MoneyProps> {
	private constructor(props: MoneyProps) {
		super(props)
	}

	static fromCents(cents: number, currency: string): Money {
		return new Money({ cents: Math.round(cents), currency })
	}

	static fromDollars(dollars: number, currency: string): Money {
		return new Money({ cents: Math.round(dollars * 100), currency })
	}

	static zero(currency: string): Money {
		return new Money({ cents: 0, currency })
	}

	get cents(): number {
		return this.props.cents
	}

	get currency(): string {
		return this.props.currency
	}

	add(other: Money): Money {
		this.assertSameCurrency(other)
		return Money.fromCents(this.cents + other.cents, this.currency)
	}

	subtract(other: Money): Money {
		this.assertSameCurrency(other)
		return Money.fromCents(this.cents - other.cents, this.currency)
	}

	multiplyByRate(rate: number): Money {
		return Money.fromCents(Math.round(this.cents * rate), this.currency)
	}

	private assertSameCurrency(other: Money): void {
		if (this.currency !== other.currency) {
			throw new Error('幣別不一致')
		}
	}

	toString(): string {
		return `${this.currency} ${(this.cents / 100).toFixed(2)}`
	}
}
```

- [ ] **Step 4: Implement RefundId**

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundId.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface RefundIdProps extends Record<string, unknown> {
	readonly value: string
}

export class RefundId extends ValueObject<RefundIdProps> {
	private constructor(props: RefundIdProps) {
		super(props)
	}

	static create(): RefundId {
		return new RefundId({ value: crypto.randomUUID() })
	}

	static from(value: string): RefundId {
		return new RefundId({ value })
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}
}
```

- [ ] **Step 5: Implement RefundType**

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundType.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

const VALID_TYPES = ['refund_only', 'return_and_refund'] as const
type RefundTypeValue = (typeof VALID_TYPES)[number]

interface RefundTypeProps extends Record<string, unknown> {
	readonly value: RefundTypeValue
}

export class RefundType extends ValueObject<RefundTypeProps> {
	private constructor(props: RefundTypeProps) {
		super(props)
	}

	static refundOnly(): RefundType {
		return new RefundType({ value: 'refund_only' })
	}

	static returnAndRefund(): RefundType {
		return new RefundType({ value: 'return_and_refund' })
	}

	static from(value: string): RefundType {
		if (!VALID_TYPES.includes(value as RefundTypeValue)) {
			throw new Error(`無效的退款類型: ${value}`)
		}
		return new RefundType({ value: value as RefundTypeValue })
	}

	get value(): string {
		return this.props.value
	}

	isRefundOnly(): boolean {
		return this.props.value === 'refund_only'
	}

	isReturnAndRefund(): boolean {
		return this.props.value === 'return_and_refund'
	}

	toString(): string {
		return this.props.value
	}
}
```

- [ ] **Step 6: Implement RefundReason**

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundReason.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

const PREDEFINED_REASONS = ['defective', 'wrong_item', 'not_as_described', 'change_of_mind', 'other'] as const
type ReasonValue = (typeof PREDEFINED_REASONS)[number]

interface RefundReasonProps extends Record<string, unknown> {
	readonly value: ReasonValue
	readonly description: string | null
}

export class RefundReason extends ValueObject<RefundReasonProps> {
	private constructor(props: RefundReasonProps) {
		super(props)
	}

	static defective(): RefundReason {
		return new RefundReason({ value: 'defective', description: null })
	}

	static wrongItem(): RefundReason {
		return new RefundReason({ value: 'wrong_item', description: null })
	}

	static notAsDescribed(): RefundReason {
		return new RefundReason({ value: 'not_as_described', description: null })
	}

	static changeOfMind(): RefundReason {
		return new RefundReason({ value: 'change_of_mind', description: null })
	}

	static other(description: string): RefundReason {
		return new RefundReason({ value: 'other', description })
	}

	static from(value: string, description?: string): RefundReason {
		if (!PREDEFINED_REASONS.includes(value as ReasonValue)) {
			throw new Error(`無效的退款原因: ${value}`)
		}
		return new RefundReason({ value: value as ReasonValue, description: description ?? null })
	}

	get value(): string {
		return this.props.value
	}

	get description(): string | null {
		return this.props.description
	}

	isOther(): boolean {
		return this.props.value === 'other'
	}

	toString(): string {
		return this.props.description ? `${this.props.value}: ${this.props.description}` : this.props.value
	}
}
```

- [ ] **Step 7: Implement ItemCondition**

```typescript
// app/Modules/Refund/Domain/ValueObjects/ItemCondition.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

const CONDITIONS = ['good', 'damaged', 'missing'] as const
type ConditionValue = (typeof CONDITIONS)[number]

interface ItemConditionProps extends Record<string, unknown> {
	readonly value: ConditionValue
}

export class ItemCondition extends ValueObject<ItemConditionProps> {
	private constructor(props: ItemConditionProps) {
		super(props)
	}

	static good(): ItemCondition {
		return new ItemCondition({ value: 'good' })
	}

	static damaged(): ItemCondition {
		return new ItemCondition({ value: 'damaged' })
	}

	static missing(): ItemCondition {
		return new ItemCondition({ value: 'missing' })
	}

	static from(value: string): ItemCondition {
		if (!CONDITIONS.includes(value as ConditionValue)) {
			throw new Error(`無效的商品狀態: ${value}`)
		}
		return new ItemCondition({ value: value as ConditionValue })
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/ValueObjects.test.ts`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add app/Modules/Refund/Domain/ValueObjects/ app/Modules/Refund/tests/Unit/ValueObjects.test.ts
git commit -m "feat: [Refund] Domain Value Objects — Money, RefundId, RefundType, RefundReason, ItemCondition"
```

---

## Task 2: Domain Value Objects — RefundStatus（狀態機）

**Files:**
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundStatus.ts`
- Test: `app/Modules/Refund/tests/Unit/RefundStatus.test.ts`

- [ ] **Step 1: Write failing tests for RefundStatus state machine**

```typescript
// app/Modules/Refund/tests/Unit/RefundStatus.test.ts
import { describe, it, expect } from 'bun:test'
import { RefundStatus } from '../../Domain/ValueObjects/RefundStatus'

describe('RefundStatus', () => {
	it('應該建立 Requested 初始狀態', () => {
		const s = RefundStatus.requested()
		expect(s.value).toBe('requested')
	})

	describe('合法狀態轉換', () => {
		it('Requested → UnderReview', () => {
			const s = RefundStatus.requested()
			expect(s.canTransitionTo(RefundStatus.underReview())).toBe(true)
		})

		it('UnderReview → Approved', () => {
			const s = RefundStatus.underReview()
			expect(s.canTransitionTo(RefundStatus.approved())).toBe(true)
		})

		it('UnderReview → Rejected', () => {
			const s = RefundStatus.underReview()
			expect(s.canTransitionTo(RefundStatus.rejected())).toBe(true)
		})

		it('Approved → AwaitingReturn', () => {
			const s = RefundStatus.approved()
			expect(s.canTransitionTo(RefundStatus.awaitingReturn())).toBe(true)
		})

		it('Approved → Processing', () => {
			const s = RefundStatus.approved()
			expect(s.canTransitionTo(RefundStatus.processing())).toBe(true)
		})

		it('AwaitingReturn → ItemsReceived', () => {
			const s = RefundStatus.awaitingReturn()
			expect(s.canTransitionTo(RefundStatus.itemsReceived())).toBe(true)
		})

		it('ItemsReceived → Processing', () => {
			const s = RefundStatus.itemsReceived()
			expect(s.canTransitionTo(RefundStatus.processing())).toBe(true)
		})

		it('Processing → Completed', () => {
			const s = RefundStatus.processing()
			expect(s.canTransitionTo(RefundStatus.completed())).toBe(true)
		})

		it('Processing → Failed', () => {
			const s = RefundStatus.processing()
			expect(s.canTransitionTo(RefundStatus.failed())).toBe(true)
		})

		it('Failed → Processing（重試）', () => {
			const s = RefundStatus.failed()
			expect(s.canTransitionTo(RefundStatus.processing())).toBe(true)
		})
	})

	describe('非法狀態轉換', () => {
		it('Requested → Completed 不允許', () => {
			const s = RefundStatus.requested()
			expect(s.canTransitionTo(RefundStatus.completed())).toBe(false)
		})

		it('Completed → Processing 不允許', () => {
			const s = RefundStatus.completed()
			expect(s.canTransitionTo(RefundStatus.processing())).toBe(false)
		})

		it('Rejected → Approved 不允許', () => {
			const s = RefundStatus.rejected()
			expect(s.canTransitionTo(RefundStatus.approved())).toBe(false)
		})
	})

	it('應該支援 from() 工廠', () => {
		const s = RefundStatus.from('approved')
		expect(s.value).toBe('approved')
	})

	it('應該拒絕無效狀態', () => {
		expect(() => RefundStatus.from('invalid')).toThrow()
	})

	describe('終態判斷', () => {
		it('Completed 是終態', () => {
			expect(RefundStatus.completed().isTerminal()).toBe(true)
		})

		it('Rejected 是終態', () => {
			expect(RefundStatus.rejected().isTerminal()).toBe(true)
		})

		it('Processing 不是終態', () => {
			expect(RefundStatus.processing().isTerminal()).toBe(false)
		})
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/RefundStatus.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement RefundStatus**

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundStatus.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

const STATUSES = [
	'requested', 'under_review', 'approved', 'rejected',
	'awaiting_return', 'items_received', 'processing', 'completed', 'failed',
] as const
type StatusValue = (typeof STATUSES)[number]

const TRANSITIONS: Record<StatusValue, StatusValue[]> = {
	requested: ['under_review'],
	under_review: ['approved', 'rejected'],
	approved: ['awaiting_return', 'processing'],
	rejected: [],
	awaiting_return: ['items_received'],
	items_received: ['processing'],
	processing: ['completed', 'failed'],
	completed: [],
	failed: ['processing'],
}

const TERMINAL: StatusValue[] = ['completed', 'rejected']

interface RefundStatusProps extends Record<string, unknown> {
	readonly value: StatusValue
}

export class RefundStatus extends ValueObject<RefundStatusProps> {
	private constructor(props: RefundStatusProps) {
		super(props)
	}

	static requested(): RefundStatus { return new RefundStatus({ value: 'requested' }) }
	static underReview(): RefundStatus { return new RefundStatus({ value: 'under_review' }) }
	static approved(): RefundStatus { return new RefundStatus({ value: 'approved' }) }
	static rejected(): RefundStatus { return new RefundStatus({ value: 'rejected' }) }
	static awaitingReturn(): RefundStatus { return new RefundStatus({ value: 'awaiting_return' }) }
	static itemsReceived(): RefundStatus { return new RefundStatus({ value: 'items_received' }) }
	static processing(): RefundStatus { return new RefundStatus({ value: 'processing' }) }
	static completed(): RefundStatus { return new RefundStatus({ value: 'completed' }) }
	static failed(): RefundStatus { return new RefundStatus({ value: 'failed' }) }

	static from(value: string): RefundStatus {
		if (!STATUSES.includes(value as StatusValue)) {
			throw new Error(`無效的退款狀態: ${value}`)
		}
		return new RefundStatus({ value: value as StatusValue })
	}

	get value(): string {
		return this.props.value
	}

	canTransitionTo(target: RefundStatus): boolean {
		const allowed = TRANSITIONS[this.props.value] ?? []
		return allowed.includes(target.props.value)
	}

	isTerminal(): boolean {
		return TERMINAL.includes(this.props.value)
	}

	toString(): string {
		return this.props.value
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/RefundStatus.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add app/Modules/Refund/Domain/ValueObjects/RefundStatus.ts app/Modules/Refund/tests/Unit/RefundStatus.test.ts
git commit -m "feat: [Refund] RefundStatus 狀態機 — 9 個狀態 + 轉換驗證"
```

---

## Task 3: Domain Value Objects — RefundCalculation、RefundFees、RefundPolicyConfig、PolicyDecision、OrderContext

**Files:**
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundCalculation.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundFees.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/RefundPolicyConfig.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/PolicyDecision.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/OrderContext.ts`
- Create: `app/Modules/Refund/Domain/ValueObjects/OrderReference.ts`

- [ ] **Step 1: Implement all remaining value objects**

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundFees.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'
import type { Money } from './Money'

interface RefundFeesProps extends Record<string, unknown> {
	readonly restockingFeeRate: number
	readonly shippingFeeCents: number
	readonly shippingFeeCurrency: string
	readonly waivedReasons: readonly string[]
}

export class RefundFees extends ValueObject<RefundFeesProps> {
	private constructor(props: RefundFeesProps) {
		super(props)
	}

	static create(restockingFeeRate: number, shippingFee: Money, waivedReasons: string[]): RefundFees {
		return new RefundFees({
			restockingFeeRate,
			shippingFeeCents: shippingFee.cents,
			shippingFeeCurrency: shippingFee.currency,
			waivedReasons,
		})
	}

	get restockingFeeRate(): number { return this.props.restockingFeeRate }
	get shippingFeeCents(): number { return this.props.shippingFeeCents }
	get shippingFeeCurrency(): string { return this.props.shippingFeeCurrency }
	get waivedReasons(): readonly string[] { return this.props.waivedReasons }

	isWaived(reason: string): boolean {
		return this.props.waivedReasons.includes(reason)
	}

	toString(): string {
		return `Fees(restock=${this.props.restockingFeeRate}, ship=${this.props.shippingFeeCents})`
	}
}
```

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundCalculation.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

export interface ItemRefundBreakdown {
	readonly productId: string
	readonly originalPriceCents: number
	readonly discountShareCents: number
	readonly adjustedPriceCents: number
	readonly quantity: number
}

interface RefundCalculationProps extends Record<string, unknown> {
	readonly subtotalCents: number
	readonly restockingFeeCents: number
	readonly shippingFeeCents: number
	readonly totalDeductionsCents: number
	readonly refundAmountCents: number
	readonly currency: string
	readonly breakdown: readonly ItemRefundBreakdown[]
}

export class RefundCalculation extends ValueObject<RefundCalculationProps> {
	private constructor(props: RefundCalculationProps) {
		super(props)
	}

	static create(
		subtotalCents: number,
		restockingFeeCents: number,
		shippingFeeCents: number,
		currency: string,
		breakdown: ItemRefundBreakdown[],
	): RefundCalculation {
		const totalDeductionsCents = restockingFeeCents + shippingFeeCents
		const refundAmountCents = Math.max(0, subtotalCents - totalDeductionsCents)
		return new RefundCalculation({
			subtotalCents,
			restockingFeeCents,
			shippingFeeCents,
			totalDeductionsCents,
			refundAmountCents,
			currency,
			breakdown,
		})
	}

	get subtotalCents(): number { return this.props.subtotalCents }
	get restockingFeeCents(): number { return this.props.restockingFeeCents }
	get shippingFeeCents(): number { return this.props.shippingFeeCents }
	get totalDeductionsCents(): number { return this.props.totalDeductionsCents }
	get refundAmountCents(): number { return this.props.refundAmountCents }
	get currency(): string { return this.props.currency }
	get breakdown(): readonly ItemRefundBreakdown[] { return this.props.breakdown }

	toString(): string {
		return `RefundCalculation(${this.props.currency} ${(this.props.refundAmountCents / 100).toFixed(2)})`
	}
}
```

```typescript
// app/Modules/Refund/Domain/ValueObjects/PolicyDecision.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface PolicyDecisionProps extends Record<string, unknown> {
	readonly type: 'auto' | 'manual'
	readonly rule: string | null
	readonly reviewerId: string | null
	readonly note: string | null
}

export class PolicyDecision extends ValueObject<PolicyDecisionProps> {
	private constructor(props: PolicyDecisionProps) {
		super(props)
	}

	static auto(rule: string): PolicyDecision {
		return new PolicyDecision({ type: 'auto', rule, reviewerId: null, note: null })
	}

	static manual(reviewerId: string, note: string): PolicyDecision {
		return new PolicyDecision({ type: 'manual', rule: null, reviewerId, note })
	}

	get type(): string { return this.props.type }
	get rule(): string | null { return this.props.rule }
	get reviewerId(): string | null { return this.props.reviewerId }
	get note(): string | null { return this.props.note }
	isAuto(): boolean { return this.props.type === 'auto' }
	isManual(): boolean { return this.props.type === 'manual' }

	toString(): string {
		return this.isAuto() ? `Auto(${this.props.rule})` : `Manual(${this.props.reviewerId})`
	}
}
```

```typescript
// app/Modules/Refund/Domain/ValueObjects/RefundPolicyConfig.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface RefundPolicyConfigProps extends Record<string, unknown> {
	readonly maxAutoApprovalDays: number
	readonly maxAutoApprovalAmountCents: number
	readonly maxAutoApprovalAmountCurrency: string
	readonly maxRecentRefunds: number
	readonly recentRefundWindowDays: number
	readonly autoApprovalReasons: readonly string[]
}

export class RefundPolicyConfig extends ValueObject<RefundPolicyConfigProps> {
	private constructor(props: RefundPolicyConfigProps) {
		super(props)
	}

	static create(params: {
		maxAutoApprovalDays?: number
		maxAutoApprovalAmountCents?: number
		maxAutoApprovalAmountCurrency?: string
		maxRecentRefunds?: number
		recentRefundWindowDays?: number
		autoApprovalReasons?: string[]
	}): RefundPolicyConfig {
		return new RefundPolicyConfig({
			maxAutoApprovalDays: params.maxAutoApprovalDays ?? 7,
			maxAutoApprovalAmountCents: params.maxAutoApprovalAmountCents ?? 10000,
			maxAutoApprovalAmountCurrency: params.maxAutoApprovalAmountCurrency ?? 'TWD',
			maxRecentRefunds: params.maxRecentRefunds ?? 3,
			recentRefundWindowDays: params.recentRefundWindowDays ?? 30,
			autoApprovalReasons: params.autoApprovalReasons ?? ['defective', 'wrong_item', 'not_as_described', 'change_of_mind'],
		})
	}

	static defaults(): RefundPolicyConfig {
		return RefundPolicyConfig.create({})
	}

	get maxAutoApprovalDays(): number { return this.props.maxAutoApprovalDays }
	get maxAutoApprovalAmountCents(): number { return this.props.maxAutoApprovalAmountCents }
	get maxRecentRefunds(): number { return this.props.maxRecentRefunds }
	get recentRefundWindowDays(): number { return this.props.recentRefundWindowDays }
	get autoApprovalReasons(): readonly string[] { return this.props.autoApprovalReasons }

	toString(): string {
		return `PolicyConfig(days=${this.props.maxAutoApprovalDays}, amount=${this.props.maxAutoApprovalAmountCents})`
	}
}
```

```typescript
// app/Modules/Refund/Domain/ValueObjects/OrderContext.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

export interface OrderLineSnapshot {
	readonly orderLineId: string
	readonly productId: string
	readonly productName: string
	readonly unitPriceCents: number
	readonly quantity: number
}

interface OrderContextProps extends Record<string, unknown> {
	readonly orderId: string
	readonly orderDate: string // ISO string
	readonly totalAmountCents: number
	readonly discountAmountCents: number
	readonly currency: string
	readonly paymentMethod: string
	readonly items: readonly OrderLineSnapshot[]
}

export class OrderContext extends ValueObject<OrderContextProps> {
	private constructor(props: OrderContextProps) {
		super(props)
	}

	static create(params: {
		orderId: string
		orderDate: Date
		totalAmountCents: number
		discountAmountCents: number
		currency: string
		paymentMethod: string
		items: OrderLineSnapshot[]
	}): OrderContext {
		return new OrderContext({
			orderId: params.orderId,
			orderDate: params.orderDate.toISOString(),
			totalAmountCents: params.totalAmountCents,
			discountAmountCents: params.discountAmountCents,
			currency: params.currency,
			paymentMethod: params.paymentMethod,
			items: params.items,
		})
	}

	get orderId(): string { return this.props.orderId }
	get orderDate(): Date { return new Date(this.props.orderDate) }
	get totalAmountCents(): number { return this.props.totalAmountCents }
	get discountAmountCents(): number { return this.props.discountAmountCents }
	get currency(): string { return this.props.currency }
	get paymentMethod(): string { return this.props.paymentMethod }
	get items(): readonly OrderLineSnapshot[] { return this.props.items }

	toString(): string {
		return `OrderContext(${this.props.orderId})`
	}
}
```

```typescript
// app/Modules/Refund/Domain/ValueObjects/OrderReference.ts
import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface OrderReferenceProps extends Record<string, unknown> {
	readonly orderId: string
	readonly orderLineId: string
}

export class OrderReference extends ValueObject<OrderReferenceProps> {
	private constructor(props: OrderReferenceProps) {
		super(props)
	}

	static create(orderId: string, orderLineId: string): OrderReference {
		return new OrderReference({ orderId, orderLineId })
	}

	get orderId(): string { return this.props.orderId }
	get orderLineId(): string { return this.props.orderLineId }

	toString(): string {
		return `${this.props.orderId}:${this.props.orderLineId}`
	}
}
```

- [ ] **Step 2: Run all value object tests**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/ValueObjects.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add app/Modules/Refund/Domain/ValueObjects/
git commit -m "feat: [Refund] 完成所有 Value Objects — RefundCalculation, RefundFees, PolicyDecision, OrderContext 等"
```

---

## Task 4: Domain Events

**Files:**
- Create: `app/Modules/Refund/Domain/Events/RefundRequested.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundAutoApproved.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundManualReviewRequired.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundApproved.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundRejected.ts`
- Create: `app/Modules/Refund/Domain/Events/ReturnItemsShipped.ts`
- Create: `app/Modules/Refund/Domain/Events/ReturnItemsReceived.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundProcessing.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundCompleted.ts`
- Create: `app/Modules/Refund/Domain/Events/RefundFailed.ts`

- [ ] **Step 1: Implement all domain events**

Each event follows the same pattern. Here is the first as a full example, followed by the rest:

```typescript
// app/Modules/Refund/Domain/Events/RefundRequested.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundRequested extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly orderId: string,
		public readonly userId: string,
		public readonly type: string,
		public readonly itemCount: number,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundRequested', { orderId, userId, type, itemCount }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			aggregateId: this.refundId,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			version: this.version,
			data: { orderId: this.orderId, userId: this.userId, type: this.type, itemCount: this.itemCount },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundAutoApproved.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundAutoApproved extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly rule: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundAutoApproved', { rule }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { rule: this.rule },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundManualReviewRequired.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundManualReviewRequired extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly reason: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundManualReviewRequired', { reason }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { reason: this.reason },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundApproved.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundApproved extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly policyType: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundApproved', { policyType }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { policyType: this.policyType },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundRejected.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundRejected extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly reviewerId: string,
		public readonly note: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundRejected', { reviewerId, note }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { reviewerId: this.reviewerId, note: this.note },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/ReturnItemsShipped.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class ReturnItemsShipped extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly trackingNumber: string | null,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'ReturnItemsShipped', { trackingNumber }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { trackingNumber: this.trackingNumber },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/ReturnItemsReceived.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class ReturnItemsReceived extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly itemConditions: Array<{ returnItemId: string; condition: string }>,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'ReturnItemsReceived', { itemConditions: JSON.stringify(itemConditions) }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { itemConditions: this.itemConditions },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundProcessing.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundProcessing extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly refundAmountCents: number,
		public readonly currency: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundProcessing', { refundAmountCents, currency }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { refundAmountCents: this.refundAmountCents, currency: this.currency },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundCompleted.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundCompleted extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly orderId: string,
		public readonly refundAmountCents: number,
		public readonly currency: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundCompleted', { orderId, refundAmountCents, currency }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { orderId: this.orderId, refundAmountCents: this.refundAmountCents, currency: this.currency },
		}
	}
}
```

```typescript
// app/Modules/Refund/Domain/Events/RefundFailed.ts
import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

export class RefundFailed extends DomainEvent {
	constructor(
		public readonly refundId: string,
		public readonly reason: string,
		occurredAt: Date = new Date(),
	) {
		super(refundId, 'RefundFailed', { reason }, 1, occurredAt)
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId, aggregateId: this.refundId, eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(), version: this.version,
			data: { reason: this.reason },
		}
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Modules/Refund/Domain/Events/
git commit -m "feat: [Refund] 10 個 Domain Events — RefundRequested 到 RefundFailed"
```

---

## Task 5: Domain — ReturnItem 子實體 + Refund 聚合根

**Files:**
- Create: `app/Modules/Refund/Domain/Entities/ReturnItem.ts`
- Create: `app/Modules/Refund/Domain/Entities/Refund.ts`
- Test: `app/Modules/Refund/tests/Unit/Refund.test.ts`

- [ ] **Step 1: Write failing tests for Refund aggregate**

```typescript
// app/Modules/Refund/tests/Unit/Refund.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { Refund } from '../../Domain/Entities/Refund'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { RefundStatus } from '../../Domain/ValueObjects/RefundStatus'
import { Money } from '../../Domain/ValueObjects/Money'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'
import { RefundRequested } from '../../Domain/Events/RefundRequested'
import { RefundApproved } from '../../Domain/Events/RefundApproved'
import { RefundRejected } from '../../Domain/Events/RefundRejected'
import { ReturnItemsShipped } from '../../Domain/Events/ReturnItemsShipped'
import { ReturnItemsReceived } from '../../Domain/Events/ReturnItemsReceived'
import { RefundProcessing } from '../../Domain/Events/RefundProcessing'
import { RefundCompleted } from '../../Domain/Events/RefundCompleted'
import { RefundFailed } from '../../Domain/Events/RefundFailed'

describe('Refund Aggregate', () => {
	let refund: Refund

	describe('建立退款申請', () => {
		it('應該建立 RefundOnly 退款並發佈 RefundRequested', () => {
			refund = Refund.create({
				orderId: 'order-1',
				userId: 'user-1',
				type: RefundType.refundOnly(),
				items: [
					{ productId: 'prod-1', productName: '商品A', originalPrice: Money.fromCents(5000, 'TWD'), quantity: 1, reason: RefundReason.defective() },
				],
			})

			expect(refund.orderId).toBe('order-1')
			expect(refund.userId).toBe('user-1')
			expect(refund.status.value).toBe('requested')
			expect(refund.items).toHaveLength(1)
			expect(refund.getUncommittedEvents()[0]).toBeInstanceOf(RefundRequested)
		})

		it('應該建立 ReturnAndRefund 退款', () => {
			refund = Refund.create({
				orderId: 'order-1',
				userId: 'user-1',
				type: RefundType.returnAndRefund(),
				items: [
					{ productId: 'prod-1', productName: '商品A', originalPrice: Money.fromCents(5000, 'TWD'), quantity: 2, reason: RefundReason.wrongItem() },
				],
			})

			expect(refund.type.isReturnAndRefund()).toBe(true)
		})
	})

	describe('審核流程', () => {
		beforeEach(() => {
			refund = Refund.create({
				orderId: 'order-1',
				userId: 'user-1',
				type: RefundType.refundOnly(),
				items: [{ productId: 'prod-1', productName: '商品A', originalPrice: Money.fromCents(5000, 'TWD'), quantity: 1, reason: RefundReason.defective() }],
			})
			refund.markEventsAsCommitted()
		})

		it('應該提交審核', () => {
			refund.submitForReview()
			expect(refund.status.value).toBe('under_review')
		})

		it('應該自動通過', () => {
			refund.submitForReview()
			refund.approve(PolicyDecision.auto('all_conditions_met'))
			expect(refund.status.value).toBe('approved')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(RefundApproved)
		})

		it('應該拒絕', () => {
			refund.submitForReview()
			refund.reject('admin-1', '不符合退款條件')
			expect(refund.status.value).toBe('rejected')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(RefundRejected)
		})

		it('不應該從 requested 直接 approve', () => {
			expect(() => refund.approve(PolicyDecision.auto('test'))).toThrow()
		})
	})

	describe('退貨流程', () => {
		beforeEach(() => {
			refund = Refund.create({
				orderId: 'order-1',
				userId: 'user-1',
				type: RefundType.returnAndRefund(),
				items: [{ productId: 'prod-1', productName: '商品A', originalPrice: Money.fromCents(5000, 'TWD'), quantity: 1, reason: RefundReason.defective() }],
			})
			refund.markEventsAsCommitted()
			refund.submitForReview()
			refund.approve(PolicyDecision.auto('ok'))
			refund.markEventsAsCommitted()
		})

		it('應該標記已寄出退貨', () => {
			refund.markItemsShipped('TRACK-123')
			expect(refund.status.value).toBe('awaiting_return')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(ReturnItemsShipped)
		})

		it('應該確認收到退貨', () => {
			refund.markItemsShipped()
			refund.confirmItemsReceived([{ returnItemId: refund.items[0].id, condition: ItemCondition.good() }])
			expect(refund.status.value).toBe('items_received')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(ReturnItemsReceived)
		})
	})

	describe('退款處理', () => {
		beforeEach(() => {
			refund = Refund.create({
				orderId: 'order-1',
				userId: 'user-1',
				type: RefundType.refundOnly(),
				items: [{ productId: 'prod-1', productName: '商品A', originalPrice: Money.fromCents(5000, 'TWD'), quantity: 1, reason: RefundReason.defective() }],
			})
			refund.markEventsAsCommitted()
			refund.submitForReview()
			refund.approve(PolicyDecision.auto('ok'))
			refund.markEventsAsCommitted()
		})

		it('RefundOnly 應該直接進入 processing', () => {
			refund.startProcessing(Money.fromCents(5000, 'TWD'))
			expect(refund.status.value).toBe('processing')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(RefundProcessing)
		})

		it('應該完成退款', () => {
			refund.startProcessing(Money.fromCents(5000, 'TWD'))
			refund.complete()
			expect(refund.status.value).toBe('completed')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(RefundCompleted)
		})

		it('應該標記退款失敗', () => {
			refund.startProcessing(Money.fromCents(5000, 'TWD'))
			refund.fail('Payment gateway timeout')
			expect(refund.status.value).toBe('failed')
			const events = refund.getUncommittedEvents()
			expect(events[events.length - 1]).toBeInstanceOf(RefundFailed)
		})

		it('Failed 應該可重試', () => {
			refund.startProcessing(Money.fromCents(5000, 'TWD'))
			refund.fail('timeout')
			refund.startProcessing(Money.fromCents(5000, 'TWD'))
			expect(refund.status.value).toBe('processing')
		})
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/Refund.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ReturnItem entity**

```typescript
// app/Modules/Refund/Domain/Entities/ReturnItem.ts
import { BaseEntity } from '@/Foundation/Domain/BaseEntity'
import type { Money } from '../ValueObjects/Money'
import type { RefundReason } from '../ValueObjects/RefundReason'
import type { ItemCondition } from '../ValueObjects/ItemCondition'

type ReturnItemStatus = 'pending' | 'shipped' | 'received' | 'inspected'

export class ReturnItem extends BaseEntity {
	private _productId: string
	private _productName: string
	private _originalPrice: Money
	private _discountShare: Money
	private _quantity: number
	private _reason: RefundReason
	private _status: ReturnItemStatus = 'pending'
	private _condition?: ItemCondition

	private constructor(params: {
		id?: string
		productId: string
		productName: string
		originalPrice: Money
		discountShare: Money
		quantity: number
		reason: RefundReason
	}) {
		super(params.id)
		this._productId = params.productId
		this._productName = params.productName
		this._originalPrice = params.originalPrice
		this._discountShare = params.discountShare
		this._quantity = params.quantity
		this._reason = params.reason
	}

	static create(params: {
		productId: string
		productName: string
		originalPrice: Money
		quantity: number
		reason: RefundReason
	}): ReturnItem {
		const { Money: M } = require('../ValueObjects/Money')
		return new ReturnItem({
			...params,
			discountShare: M.zero(params.originalPrice.currency),
		})
	}

	static reconstitute(params: {
		id: string
		productId: string
		productName: string
		originalPrice: Money
		discountShare: Money
		quantity: number
		reason: RefundReason
		status: ReturnItemStatus
		condition?: ItemCondition
	}): ReturnItem {
		const item = new ReturnItem(params)
		item._status = params.status
		item._condition = params.condition
		return item
	}

	get productId(): string { return this._productId }
	get productName(): string { return this._productName }
	get originalPrice(): Money { return this._originalPrice }
	get discountShare(): Money { return this._discountShare }
	get quantity(): number { return this._quantity }
	get reason(): RefundReason { return this._reason }
	get status(): ReturnItemStatus { return this._status }
	get condition(): ItemCondition | undefined { return this._condition }

	markShipped(): void { this._status = 'shipped' }
	markReceived(condition: ItemCondition): void {
		this._status = 'received'
		this._condition = condition
	}

	setDiscountShare(amount: Money): void { this._discountShare = amount }
}
```

Note: The `ReturnItem.create` method uses a dynamic import pattern to avoid circular dependency. A cleaner approach is to pass `Money.zero()` from the Refund aggregate factory instead. Let me fix that — `ReturnItem.create` should accept a discountShare parameter defaulting at the caller:

```typescript
// Fix: ReturnItem.create — no dynamic import
static create(params: {
	productId: string
	productName: string
	originalPrice: Money
	discountShare: Money
	quantity: number
	reason: RefundReason
}): ReturnItem {
	return new ReturnItem(params)
}
```

The Refund aggregate factory will pass `Money.zero(originalPrice.currency)` when creating items.

- [ ] **Step 4: Implement Refund aggregate**

```typescript
// app/Modules/Refund/Domain/Entities/Refund.ts
import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { ReturnItem } from './ReturnItem'
import { RefundId } from '../ValueObjects/RefundId'
import { RefundType } from '../ValueObjects/RefundType'
import { RefundStatus } from '../ValueObjects/RefundStatus'
import { RefundReason } from '../ValueObjects/RefundReason'
import { Money } from '../ValueObjects/Money'
import type { RefundCalculation } from '../ValueObjects/RefundCalculation'
import type { PolicyDecision } from '../ValueObjects/PolicyDecision'
import type { ItemCondition } from '../ValueObjects/ItemCondition'
import { RefundRequested } from '../Events/RefundRequested'
import { RefundAutoApproved } from '../Events/RefundAutoApproved'
import { RefundManualReviewRequired } from '../Events/RefundManualReviewRequired'
import { RefundApproved } from '../Events/RefundApproved'
import { RefundRejected } from '../Events/RefundRejected'
import { ReturnItemsShipped } from '../Events/ReturnItemsShipped'
import { ReturnItemsReceived } from '../Events/ReturnItemsReceived'
import { RefundProcessing } from '../Events/RefundProcessing'
import { RefundCompleted } from '../Events/RefundCompleted'
import { RefundFailed } from '../Events/RefundFailed'

interface CreateRefundParams {
	orderId: string
	userId: string
	type: RefundType
	items: Array<{
		productId: string
		productName: string
		originalPrice: Money
		quantity: number
		reason: RefundReason
	}>
}

export class Refund extends AggregateRoot {
	private _refundId!: RefundId
	private _orderId!: string
	private _userId!: string
	private _type!: RefundType
	private _status!: RefundStatus
	private _items: ReturnItem[] = []
	private _calculation: RefundCalculation | null = null
	private _policy: PolicyDecision | null = null
	private _rejectionNote: string | null = null
	private _requestedAt!: Date
	private _resolvedAt: Date | null = null

	private constructor(id: string) {
		super(id)
	}

	static create(params: CreateRefundParams): Refund {
		const refundId = RefundId.create()
		const refund = new Refund(refundId.value)

		const items = params.items.map((item) =>
			ReturnItem.create({
				...item,
				discountShare: Money.zero(item.originalPrice.currency),
			})
		)

		refund._refundId = refundId
		refund._orderId = params.orderId
		refund._userId = params.userId
		refund._type = params.type
		refund._status = RefundStatus.requested()
		refund._items = items
		refund._requestedAt = new Date()

		refund.raiseEvent(new RefundRequested(
			refundId.value, params.orderId, params.userId,
			params.type.value, items.length,
		))

		return refund
	}

	static reconstitute(params: {
		id: string
		orderId: string
		userId: string
		type: RefundType
		status: RefundStatus
		items: ReturnItem[]
		calculation: RefundCalculation | null
		policy: PolicyDecision | null
		rejectionNote: string | null
		requestedAt: Date
		resolvedAt: Date | null
	}): Refund {
		const refund = new Refund(params.id)
		refund._refundId = RefundId.from(params.id)
		refund._orderId = params.orderId
		refund._userId = params.userId
		refund._type = params.type
		refund._status = params.status
		refund._items = params.items
		refund._calculation = params.calculation
		refund._policy = params.policy
		refund._rejectionNote = params.rejectionNote
		refund._requestedAt = params.requestedAt
		refund._resolvedAt = params.resolvedAt
		return refund
	}

	// Getters
	get orderId(): string { return this._orderId }
	get userId(): string { return this._userId }
	get type(): RefundType { return this._type }
	get status(): RefundStatus { return this._status }
	get items(): readonly ReturnItem[] { return [...this._items] }
	get calculation(): RefundCalculation | null { return this._calculation }
	get policy(): PolicyDecision | null { return this._policy }
	get rejectionNote(): string | null { return this._rejectionNote }
	get requestedAt(): Date { return this._requestedAt }
	get resolvedAt(): Date | null { return this._resolvedAt }

	// Business methods
	submitForReview(): void {
		this.assertTransition(RefundStatus.underReview())
		this._status = RefundStatus.underReview()
	}

	approve(decision: PolicyDecision): void {
		this.assertTransition(RefundStatus.approved())
		this._status = RefundStatus.approved()
		this._policy = decision

		this.raiseEvent(new RefundApproved(this.id, decision.type))

		if (decision.isAuto()) {
			this.raiseEvent(new RefundAutoApproved(this.id, decision.rule!))
		}
	}

	reject(reviewerId: string, note: string): void {
		this.assertTransition(RefundStatus.rejected())
		this._status = RefundStatus.rejected()
		this._policy = PolicyDecision.manual(reviewerId, note)
		this._rejectionNote = note
		this._resolvedAt = new Date()

		this.raiseEvent(new RefundRejected(this.id, reviewerId, note))
	}

	markItemsShipped(trackingNumber?: string): void {
		this.assertTransition(RefundStatus.awaitingReturn())
		this._status = RefundStatus.awaitingReturn()
		for (const item of this._items) {
			item.markShipped()
		}
		this.raiseEvent(new ReturnItemsShipped(this.id, trackingNumber ?? null))
	}

	confirmItemsReceived(conditions: Array<{ returnItemId: string; condition: ItemCondition }>): void {
		this.assertTransition(RefundStatus.itemsReceived())
		for (const c of conditions) {
			const item = this._items.find((i) => i.id === c.returnItemId)
			if (item) item.markReceived(c.condition)
		}
		this._status = RefundStatus.itemsReceived()

		this.raiseEvent(new ReturnItemsReceived(
			this.id,
			conditions.map((c) => ({ returnItemId: c.returnItemId, condition: c.condition.value })),
		))
	}

	startProcessing(refundAmount: Money): void {
		this.assertTransition(RefundStatus.processing())
		this._status = RefundStatus.processing()

		this.raiseEvent(new RefundProcessing(this.id, refundAmount.cents, refundAmount.currency))
	}

	complete(): void {
		this.assertTransition(RefundStatus.completed())
		this._status = RefundStatus.completed()
		this._resolvedAt = new Date()

		const amountCents = this._calculation?.refundAmountCents ?? 0
		const currency = this._calculation?.currency ?? 'TWD'
		this.raiseEvent(new RefundCompleted(this.id, this._orderId, amountCents, currency))
	}

	fail(reason: string): void {
		this.assertTransition(RefundStatus.failed())
		this._status = RefundStatus.failed()

		this.raiseEvent(new RefundFailed(this.id, reason))
	}

	setCalculation(calc: RefundCalculation): void {
		this._calculation = calc
	}

	// applyEvent — required by AggregateRoot
	applyEvent(_event: DomainEvent): void {
		// State changes are done in the business methods directly
		// This is consistent with Cart aggregate pattern where
		// some aggregates use applyEvent for reconstruction
		// and direct mutation for creation
	}

	private assertTransition(target: RefundStatus): void {
		if (!this._status.canTransitionTo(target)) {
			throw new Error(`無效的狀態轉換: ${this._status.value} → ${target.value}`)
		}
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/Refund.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add app/Modules/Refund/Domain/Entities/
git commit -m "feat: [Refund] Refund 聚合根 + ReturnItem 子實體 — 完整狀態機與業務方法"
```

---

## Task 6: Domain Services — RefundPolicy + RefundCalculator

**Files:**
- Create: `app/Modules/Refund/Domain/Services/RefundPolicy.ts`
- Create: `app/Modules/Refund/Domain/Services/RefundCalculator.ts`
- Create: `app/Modules/Refund/Domain/Ports/IOrderQueryPort.ts`
- Create: `app/Modules/Refund/Domain/Ports/IRefundHistoryPort.ts`
- Create: `app/Modules/Refund/Domain/Repositories/IRefundRepository.ts`
- Test: `app/Modules/Refund/tests/Unit/RefundPolicy.test.ts`
- Test: `app/Modules/Refund/tests/Unit/RefundCalculator.test.ts`

- [ ] **Step 1: Create Domain Ports and Repository interface**

```typescript
// app/Modules/Refund/Domain/Ports/IOrderQueryPort.ts
import type { OrderContext } from '../ValueObjects/OrderContext'

export interface IOrderQueryPort {
	getOrderContext(orderId: string): Promise<OrderContext>
}
```

```typescript
// app/Modules/Refund/Domain/Ports/IRefundHistoryPort.ts
export interface IRefundHistoryPort {
	countRecentRefunds(userId: string, withinDays: number): Promise<number>
}
```

```typescript
// app/Modules/Refund/Domain/Repositories/IRefundRepository.ts
import type { IRepository } from '@/Foundation/Domain/IRepository'
import type { Refund } from '../Entities/Refund'

export interface IRefundRepository extends IRepository<Refund> {
	findByOrderId(orderId: string): Promise<Refund[]>
	findByUserId(userId: string, params?: { limit?: number; offset?: number }): Promise<Refund[]>
	findByStatus(status: string, params?: { limit?: number; offset?: number }): Promise<Refund[]>
}
```

- [ ] **Step 2: Write failing tests for RefundPolicy**

```typescript
// app/Modules/Refund/tests/Unit/RefundPolicy.test.ts
import { describe, it, expect } from 'bun:test'
import { RefundPolicy } from '../../Domain/Services/RefundPolicy'
import { Refund } from '../../Domain/Entities/Refund'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import { Money } from '../../Domain/ValueObjects/Money'
import { OrderContext } from '../../Domain/ValueObjects/OrderContext'

const makeRefund = (reason: RefundReason = RefundReason.defective(), priceCents = 5000) =>
	Refund.create({
		orderId: 'order-1',
		userId: 'user-1',
		type: RefundType.refundOnly(),
		items: [{ productId: 'p1', productName: '商品', originalPrice: Money.fromCents(priceCents, 'TWD'), quantity: 1, reason }],
	})

const makeOrderContext = (daysBefore: number = 3, totalCents = 10000) =>
	OrderContext.create({
		orderId: 'order-1',
		orderDate: new Date(Date.now() - daysBefore * 86400000),
		totalAmountCents: totalCents,
		discountAmountCents: 0,
		currency: 'TWD',
		paymentMethod: 'credit_card',
		items: [{ orderLineId: 'ol-1', productId: 'p1', productName: '商品', unitPriceCents: 5000, quantity: 2 }],
	})

describe('RefundPolicy', () => {
	const policy = new RefundPolicy()
	const config = RefundPolicyConfig.defaults()

	it('應該自動通過符合所有條件的退款', () => {
		const refund = makeRefund(RefundReason.defective(), 5000)
		const ctx = makeOrderContext(3)
		const decision = policy.evaluate(refund, ctx, 0, config)
		expect(decision.isAuto()).toBe(true)
	})

	it('超過天數限制應該人工審核', () => {
		const refund = makeRefund()
		const ctx = makeOrderContext(10) // > 7 days
		const decision = policy.evaluate(refund, ctx, 0, config)
		expect(decision.isManual()).toBe(false) // 注意：此處 policy 回傳的是 ManualReview 標記
		// 實際上 evaluate 返回 PolicyDecision，isManual 或 isAuto
		expect(decision.isAuto()).toBe(false)
	})

	it('退款金額超過閾值應該人工審核', () => {
		const refund = makeRefund(RefundReason.defective(), 20000) // > 10000 default
		const ctx = makeOrderContext(3)
		const decision = policy.evaluate(refund, ctx, 0, config)
		expect(decision.isAuto()).toBe(false)
	})

	it('近期退款次數過多應該人工審核', () => {
		const refund = makeRefund()
		const ctx = makeOrderContext(3)
		const decision = policy.evaluate(refund, ctx, 4, config) // > 3
		expect(decision.isAuto()).toBe(false)
	})

	it('Other 原因應該人工審核', () => {
		const refund = makeRefund(RefundReason.other('自定義'))
		const ctx = makeOrderContext(3)
		const decision = policy.evaluate(refund, ctx, 0, config)
		expect(decision.isAuto()).toBe(false)
	})

	it('所有條件邊界值通過', () => {
		const refund = makeRefund(RefundReason.defective(), 10000) // exactly at limit
		const ctx = makeOrderContext(7) // exactly at limit
		const decision = policy.evaluate(refund, ctx, 3, config) // exactly at limit
		expect(decision.isAuto()).toBe(true)
	})
})
```

- [ ] **Step 3: Implement RefundPolicy**

```typescript
// app/Modules/Refund/Domain/Services/RefundPolicy.ts
import type { Refund } from '../Entities/Refund'
import type { OrderContext } from '../ValueObjects/OrderContext'
import type { RefundPolicyConfig } from '../ValueObjects/RefundPolicyConfig'
import { PolicyDecision } from '../ValueObjects/PolicyDecision'

export class RefundPolicy {
	evaluate(
		refund: Refund,
		orderContext: OrderContext,
		recentRefundCount: number,
		config: RefundPolicyConfig,
	): PolicyDecision {
		const daysSinceOrder = Math.floor(
			(Date.now() - orderContext.orderDate.getTime()) / (1000 * 60 * 60 * 24)
		)

		// 計算退款總額（各品項原價 × 數量）
		const totalRefundCents = refund.items.reduce(
			(sum, item) => sum + item.originalPrice.cents * item.quantity, 0
		)

		// 檢查退款原因是否全部在白名單中
		const allReasonsAllowed = refund.items.every(
			(item) => config.autoApprovalReasons.includes(item.reason.value)
		)

		const withinDays = daysSinceOrder <= config.maxAutoApprovalDays
		const withinAmount = totalRefundCents <= config.maxAutoApprovalAmountCents
		const withinRefundLimit = recentRefundCount <= config.maxRecentRefunds

		if (withinDays && withinAmount && withinRefundLimit && allReasonsAllowed) {
			return PolicyDecision.auto('all_conditions_met')
		}

		const reasons: string[] = []
		if (!withinDays) reasons.push(`超過 ${config.maxAutoApprovalDays} 天`)
		if (!withinAmount) reasons.push(`金額超過閾值`)
		if (!withinRefundLimit) reasons.push(`近期退款次數過多`)
		if (!allReasonsAllowed) reasons.push(`包含需人工審核的原因`)

		return PolicyDecision.manual('system', reasons.join('; '))
	}
}
```

- [ ] **Step 4: Write failing tests for RefundCalculator**

```typescript
// app/Modules/Refund/tests/Unit/RefundCalculator.test.ts
import { describe, it, expect } from 'bun:test'
import { RefundCalculator } from '../../Domain/Services/RefundCalculator'
import { ReturnItem } from '../../Domain/Entities/ReturnItem'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { RefundFees } from '../../Domain/ValueObjects/RefundFees'
import { OrderContext } from '../../Domain/ValueObjects/OrderContext'

const makeItem = (priceCents: number, quantity: number, reason: RefundReason = RefundReason.changeOfMind()) =>
	ReturnItem.create({
		productId: `p-${priceCents}`,
		productName: `商品${priceCents}`,
		originalPrice: Money.fromCents(priceCents, 'TWD'),
		discountShare: Money.zero('TWD'),
		quantity,
		reason,
	})

const makeOrderContext = (totalCents: number, discountCents: number) =>
	OrderContext.create({
		orderId: 'order-1',
		orderDate: new Date(),
		totalAmountCents: totalCents,
		discountAmountCents: discountCents,
		currency: 'TWD',
		paymentMethod: 'credit_card',
		items: [
			{ orderLineId: 'ol-1', productId: 'p-6000', productName: '商品A', unitPriceCents: 6000, quantity: 1 },
			{ orderLineId: 'ol-2', productId: 'p-4000', productName: '商品B', unitPriceCents: 4000, quantity: 1 },
		],
	})

const defaultFees = RefundFees.create(0.1, Money.fromCents(500, 'TWD'), ['defective', 'wrong_item'])

describe('RefundCalculator', () => {
	const calculator = new RefundCalculator()

	it('無折扣、無手續費豁免：應該正確計算', () => {
		const item = makeItem(6000, 1)
		const ctx = makeOrderContext(10000, 0)
		const result = calculator.calculate([item], ctx, defaultFees)

		// subtotal = 6000 (no discount)
		// restocking = 6000 * 0.1 = 600
		// shipping = 500
		// refund = 6000 - 600 - 500 = 4900
		expect(result.subtotalCents).toBe(6000)
		expect(result.restockingFeeCents).toBe(600)
		expect(result.shippingFeeCents).toBe(500)
		expect(result.refundAmountCents).toBe(4900)
	})

	it('有折扣應該按比例分攤', () => {
		// 訂單: A(6000) + B(4000) = 10000, 折扣 2000
		// 退 A: 佔比 6000/10000 = 60%, 分攤折扣 = 2000*60% = 1200
		// A 折後價 = 6000 - 1200 = 4800
		const item = makeItem(6000, 1)
		const ctx = makeOrderContext(10000, 2000)
		const result = calculator.calculate([item], ctx, defaultFees)

		expect(result.subtotalCents).toBe(4800) // 6000 - 1200
		expect(result.breakdown[0].discountShareCents).toBe(1200)
		expect(result.breakdown[0].adjustedPriceCents).toBe(4800)
	})

	it('Defective 原因應該免除手續費', () => {
		const item = makeItem(6000, 1, RefundReason.defective())
		const ctx = makeOrderContext(10000, 0)
		const result = calculator.calculate([item], ctx, defaultFees)

		expect(result.restockingFeeCents).toBe(0)
		expect(result.shippingFeeCents).toBe(0)
		expect(result.refundAmountCents).toBe(6000)
	})

	it('多數量商品應該正確計算', () => {
		const item = makeItem(3000, 2) // 2 件 × 3000 = 6000
		const ctx = makeOrderContext(10000, 0)
		const result = calculator.calculate([item], ctx, defaultFees)

		// subtotal = 6000
		// restocking = 6000 * 0.1 = 600
		// shipping = 500
		expect(result.subtotalCents).toBe(6000)
		expect(result.restockingFeeCents).toBe(600)
	})

	it('部分退貨多品項', () => {
		const itemA = makeItem(6000, 1) // 退 A
		const itemB = makeItem(4000, 1) // 退 B
		const ctx = makeOrderContext(10000, 2000) // 折扣 2000
		const result = calculator.calculate([itemA, itemB], ctx, defaultFees)

		// 全部退：折後 = 10000 - 2000 = 8000
		expect(result.subtotalCents).toBe(8000)
	})

	it('整數精度不應有浮點誤差', () => {
		// 3 件各 3333 cents, 折扣 1000
		const item = makeItem(3333, 1)
		const ctx = makeOrderContext(9999, 1000)
		const result = calculator.calculate([item], ctx, defaultFees)

		// 佔比 = 3333/9999 = 0.33333...
		// 分攤折扣 = round(1000 * 0.33333) = 333
		// 折後 = 3333 - 333 = 3000
		expect(result.subtotalCents).toBe(3000)
		expect(Number.isInteger(result.refundAmountCents)).toBe(true)
	})
})
```

- [ ] **Step 5: Implement RefundCalculator**

```typescript
// app/Modules/Refund/Domain/Services/RefundCalculator.ts
import type { ReturnItem } from '../Entities/ReturnItem'
import type { OrderContext } from '../ValueObjects/OrderContext'
import type { RefundFees } from '../ValueObjects/RefundFees'
import { RefundCalculation, type ItemRefundBreakdown } from '../ValueObjects/RefundCalculation'

export class RefundCalculator {
	calculate(items: readonly ReturnItem[], orderContext: OrderContext, fees: RefundFees): RefundCalculation {
		const orderTotalCents = orderContext.totalAmountCents
		const discountCents = orderContext.discountAmountCents
		const currency = orderContext.currency

		// 判斷是否免手續費（任一品項原因在豁免清單即全免）
		const isWaived = items.some((item) => fees.isWaived(item.reason.value))

		// 計算各品項折扣分攤
		const breakdown: ItemRefundBreakdown[] = items.map((item) => {
			const itemTotalCents = item.originalPrice.cents * item.quantity
			const proportion = orderTotalCents > 0 ? itemTotalCents / orderTotalCents : 0
			const discountShareCents = Math.round(discountCents * proportion)
			const adjustedPriceCents = itemTotalCents - discountShareCents

			return {
				productId: item.productId,
				originalPriceCents: item.originalPrice.cents,
				discountShareCents,
				adjustedPriceCents,
				quantity: item.quantity,
			}
		})

		const subtotalCents = breakdown.reduce((sum, b) => sum + b.adjustedPriceCents, 0)

		const restockingFeeCents = isWaived ? 0 : Math.round(subtotalCents * fees.restockingFeeRate)
		const shippingFeeCents = isWaived ? 0 : fees.shippingFeeCents

		return RefundCalculation.create(subtotalCents, restockingFeeCents, shippingFeeCents, currency, breakdown)
	}
}
```

- [ ] **Step 6: Run all tests**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/Unit/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add app/Modules/Refund/Domain/Services/ app/Modules/Refund/Domain/Ports/ app/Modules/Refund/Domain/Repositories/ app/Modules/Refund/tests/Unit/RefundPolicy.test.ts app/Modules/Refund/tests/Unit/RefundCalculator.test.ts
git commit -m "feat: [Refund] Domain Services — RefundPolicy 審核策略 + RefundCalculator 金額計算"
```

---

## Task 7: Application Layer — DTOs + RefundApplicationService

**Files:**
- Create: `app/Modules/Refund/Application/DTOs/CreateRefundDTO.ts`
- Create: `app/Modules/Refund/Application/DTOs/RefundDTO.ts`
- Create: `app/Modules/Refund/Application/DTOs/ItemConditionDTO.ts`
- Create: `app/Modules/Refund/Application/Queries/IRefundQueryService.ts`
- Create: `app/Modules/Refund/Application/Services/RefundApplicationService.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// app/Modules/Refund/Application/DTOs/CreateRefundDTO.ts
export interface CreateRefundDTO {
	orderId: string
	type: 'refund_only' | 'return_and_refund'
	items: Array<{
		orderLineId: string
		quantity: number
		reason: string
		reasonDescription?: string
	}>
}
```

```typescript
// app/Modules/Refund/Application/DTOs/RefundDTO.ts
export interface ReturnItemDTO {
	id: string
	productId: string
	productName: string
	originalPriceCents: number
	discountShareCents: number
	quantity: number
	reason: string
	status: string
	condition: string | null
}

export interface RefundCalculationDTO {
	subtotalCents: number
	restockingFeeCents: number
	shippingFeeCents: number
	totalDeductionsCents: number
	refundAmountCents: number
	currency: string
}

export interface RefundDTO {
	id: string
	orderId: string
	userId: string
	type: string
	status: string
	items: ReturnItemDTO[]
	calculation: RefundCalculationDTO | null
	policyType: string | null
	rejectionNote: string | null
	requestedAt: string
	resolvedAt: string | null
}

export function toRefundDTO(refund: import('../../Domain/Entities/Refund').Refund): RefundDTO {
	return {
		id: refund.id,
		orderId: refund.orderId,
		userId: refund.userId,
		type: refund.type.value,
		status: refund.status.value,
		items: refund.items.map((item) => ({
			id: item.id,
			productId: item.productId,
			productName: item.productName,
			originalPriceCents: item.originalPrice.cents,
			discountShareCents: item.discountShare.cents,
			quantity: item.quantity,
			reason: item.reason.value,
			status: item.status,
			condition: item.condition?.value ?? null,
		})),
		calculation: refund.calculation
			? {
					subtotalCents: refund.calculation.subtotalCents,
					restockingFeeCents: refund.calculation.restockingFeeCents,
					shippingFeeCents: refund.calculation.shippingFeeCents,
					totalDeductionsCents: refund.calculation.totalDeductionsCents,
					refundAmountCents: refund.calculation.refundAmountCents,
					currency: refund.calculation.currency,
				}
			: null,
		policyType: refund.policy?.type ?? null,
		rejectionNote: refund.rejectionNote,
		requestedAt: refund.requestedAt.toISOString(),
		resolvedAt: refund.resolvedAt?.toISOString() ?? null,
	}
}
```

```typescript
// app/Modules/Refund/Application/DTOs/ItemConditionDTO.ts
export interface ItemConditionDTO {
	returnItemId: string
	condition: 'good' | 'damaged' | 'missing'
}
```

- [ ] **Step 2: Create IRefundQueryService**

```typescript
// app/Modules/Refund/Application/Queries/IRefundQueryService.ts
import type { RefundDTO } from '../DTOs/RefundDTO'

export interface IRefundQueryService {
	getById(refundId: string): Promise<RefundDTO | null>
	getByOrderId(orderId: string): Promise<RefundDTO[]>
	getByUserId(userId: string, pagination?: { limit?: number; offset?: number }): Promise<RefundDTO[]>
	getPendingReviews(pagination?: { limit?: number; offset?: number }): Promise<RefundDTO[]>
}
```

- [ ] **Step 3: Create RefundApplicationService**

```typescript
// app/Modules/Refund/Application/Services/RefundApplicationService.ts
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import type { IOrderQueryPort } from '../../Domain/Ports/IOrderQueryPort'
import type { IRefundHistoryPort } from '../../Domain/Ports/IRefundHistoryPort'
import { Refund } from '../../Domain/Entities/Refund'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import { RefundFees } from '../../Domain/ValueObjects/RefundFees'
import { RefundPolicy } from '../../Domain/Services/RefundPolicy'
import { RefundCalculator } from '../../Domain/Services/RefundCalculator'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'
import { type RefundDTO, toRefundDTO } from '../DTOs/RefundDTO'
import type { CreateRefundDTO } from '../DTOs/CreateRefundDTO'
import type { ItemConditionDTO } from '../DTOs/ItemConditionDTO'

export class RefundApplicationService {
	private readonly policy = new RefundPolicy()
	private readonly calculator = new RefundCalculator()

	constructor(
		private readonly refundRepository: IRefundRepository,
		private readonly orderQuery: IOrderQueryPort,
		private readonly refundHistory: IRefundHistoryPort,
		private readonly policyConfig: RefundPolicyConfig,
		private readonly fees: RefundFees,
	) {}

	async requestRefund(dto: CreateRefundDTO, userId: string): Promise<RefundDTO> {
		const orderContext = await this.orderQuery.getOrderContext(dto.orderId)

		const items = dto.items.map((item) => {
			const orderLine = orderContext.items.find((ol) => ol.orderLineId === item.orderLineId)
			if (!orderLine) throw new Error(`訂單品項不存在: ${item.orderLineId}`)

			return {
				productId: orderLine.productId,
				productName: orderLine.productName,
				originalPrice: Money.fromCents(orderLine.unitPriceCents, orderContext.currency),
				quantity: item.quantity,
				reason: RefundReason.from(item.reason, item.reasonDescription),
			}
		})

		const refund = Refund.create({
			orderId: dto.orderId,
			userId,
			type: RefundType.from(dto.type),
			items,
		})

		// 計算退款金額
		const calculation = this.calculator.calculate(refund.items, orderContext, this.fees)
		refund.setCalculation(calculation)

		// 自動審核
		const recentCount = await this.refundHistory.countRecentRefunds(userId, this.policyConfig.recentRefundWindowDays)
		refund.submitForReview()
		const decision = this.policy.evaluate(refund, orderContext, recentCount, this.policyConfig)

		if (decision.isAuto()) {
			refund.approve(decision)
		}
		// Manual review stays in under_review status

		await this.refundRepository.save(refund)
		return toRefundDTO(refund)
	}

	async approveRefund(refundId: string, reviewerId?: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)
		const { PolicyDecision } = await import('../../Domain/ValueObjects/PolicyDecision')
		const decision = reviewerId
			? PolicyDecision.manual(reviewerId, '人工審核通過')
			: PolicyDecision.auto('manual_override')
		refund.approve(decision)
		await this.refundRepository.save(refund)
		return toRefundDTO(refund)
	}

	async rejectRefund(refundId: string, reviewerId: string, note: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)
		refund.reject(reviewerId, note)
		await this.refundRepository.save(refund)
		return toRefundDTO(refund)
	}

	async markItemsShipped(refundId: string, trackingNumber?: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)
		refund.markItemsShipped(trackingNumber)
		await this.refundRepository.save(refund)
		return toRefundDTO(refund)
	}

	async confirmItemsReceived(refundId: string, conditions: ItemConditionDTO[]): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)
		refund.confirmItemsReceived(
			conditions.map((c) => ({ returnItemId: c.returnItemId, condition: ItemCondition.from(c.condition) }))
		)
		await this.refundRepository.save(refund)
		return toRefundDTO(refund)
	}

	async processRefund(refundId: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)
		const amountCents = refund.calculation?.refundAmountCents ?? 0
		const currency = refund.calculation?.currency ?? 'TWD'
		refund.startProcessing(Money.fromCents(amountCents, currency))
		await this.refundRepository.save(refund)
		return toRefundDTO(refund)
	}

	private async findRefundOrFail(refundId: string): Promise<Refund> {
		const refund = await this.refundRepository.findById(refundId)
		if (!refund) throw new Error(`退款申請不存在: ${refundId}`)
		return refund
	}
}
```

- [ ] **Step 4: Commit**

```bash
git add app/Modules/Refund/Application/
git commit -m "feat: [Refund] Application 層 — DTOs, RefundApplicationService, IRefundQueryService"
```

---

## Task 8: Presentation Layer — IRefundMessages + i18n + Controller + Routes

**Files:**
- Create: `app/Modules/Refund/Presentation/Ports/IRefundMessages.ts`
- Create: `app/Modules/Refund/Presentation/Controllers/RefundController.ts`
- Create: `app/Modules/Refund/Presentation/Routes/api.ts`
- Create: `app/Modules/Refund/Infrastructure/Services/RefundMessageService.ts`
- Create: `resources/lang/zh-TW/refund.json`
- Create: `resources/lang/en/refund.json`

- [ ] **Step 1: Create IRefundMessages port**

```typescript
// app/Modules/Refund/Presentation/Ports/IRefundMessages.ts
export interface IRefundMessages {
	notFound(): string
	alreadyProcessing(): string
	invalidStatusTransition(from: string, to: string): string
	requestSuccess(): string
	approveSuccess(): string
	rejectSuccess(): string
	itemsShippedSuccess(): string
	itemsReceivedSuccess(): string
	refundCompleted(amount: string): string
	refundFailed(): string
	missingRequiredFields(): string
	exceedsOrderAmount(): string
	orderNotEligible(): string
}
```

- [ ] **Step 2: Create RefundMessageService**

```typescript
// app/Modules/Refund/Infrastructure/Services/RefundMessageService.ts
import type { IRefundMessages } from '@/Modules/Refund/Presentation/Ports/IRefundMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class RefundMessageService implements IRefundMessages {
	constructor(private translator: ITranslator) {}

	notFound(): string { return this.translator.trans('refund.not_found') }
	alreadyProcessing(): string { return this.translator.trans('refund.already_processing') }
	invalidStatusTransition(from: string, to: string): string { return this.translator.trans('refund.invalid_status_transition').replace(':from', from).replace(':to', to) }
	requestSuccess(): string { return this.translator.trans('refund.request_success') }
	approveSuccess(): string { return this.translator.trans('refund.approve_success') }
	rejectSuccess(): string { return this.translator.trans('refund.reject_success') }
	itemsShippedSuccess(): string { return this.translator.trans('refund.items_shipped_success') }
	itemsReceivedSuccess(): string { return this.translator.trans('refund.items_received_success') }
	refundCompleted(amount: string): string { return this.translator.trans('refund.refund_completed').replace(':amount', amount) }
	refundFailed(): string { return this.translator.trans('refund.refund_failed') }
	missingRequiredFields(): string { return this.translator.trans('refund.missing_required_fields') }
	exceedsOrderAmount(): string { return this.translator.trans('refund.exceeds_order_amount') }
	orderNotEligible(): string { return this.translator.trans('refund.order_not_eligible') }
}
```

- [ ] **Step 3: Create translation files**

```json
// resources/lang/zh-TW/refund.json
{
	"not_found": "退款申請不存在",
	"already_processing": "退款正在處理中",
	"invalid_status_transition": "無效的狀態轉換: :from → :to",
	"request_success": "退款申請已提交",
	"approve_success": "退款申請已通過",
	"reject_success": "退款申請已拒絕",
	"items_shipped_success": "退貨已標記寄出",
	"items_received_success": "退貨已確認收到",
	"refund_completed": "退款完成，金額: :amount",
	"refund_failed": "退款失敗",
	"missing_required_fields": "缺少必要欄位",
	"exceeds_order_amount": "退款金額超過訂單金額",
	"order_not_eligible": "此訂單不符合退款條件"
}
```

```json
// resources/lang/en/refund.json
{
	"not_found": "Refund request not found",
	"already_processing": "Refund is already being processed",
	"invalid_status_transition": "Invalid status transition: :from → :to",
	"request_success": "Refund request submitted",
	"approve_success": "Refund request approved",
	"reject_success": "Refund request rejected",
	"items_shipped_success": "Return items marked as shipped",
	"items_received_success": "Return items confirmed received",
	"refund_completed": "Refund completed, amount: :amount",
	"refund_failed": "Refund failed",
	"missing_required_fields": "Missing required fields",
	"exceeds_order_amount": "Refund amount exceeds order amount",
	"order_not_eligible": "This order is not eligible for refund"
}
```

- [ ] **Step 4: Create RefundController**

```typescript
// app/Modules/Refund/Presentation/Controllers/RefundController.ts
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import type { IRefundQueryService } from '../../Application/Queries/IRefundQueryService'
import type { IRefundMessages } from '../Ports/IRefundMessages'

export class RefundController {
	constructor(
		private readonly refundService: RefundApplicationService,
		private readonly queryService: IRefundQueryService,
		private readonly messages: IRefundMessages,
	) {}

	async requestRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<{ orderId: string; type: string; items: any[] }>()
			if (!body.orderId || !body.type || !body.items?.length) {
				return ctx.json({ success: false, error: this.messages.missingRequiredFields() }, 400)
			}
			const userId = ctx.params.userId ?? 'anonymous'
			const result = await this.refundService.requestRefund(
				{ orderId: body.orderId, type: body.type as any, items: body.items },
				userId,
			)
			return ctx.json({ success: true, data: result, message: this.messages.requestSuccess() }, 201)
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 400)
		}
	}

	async getRefund(ctx: IHttpContext): Promise<Response> {
		const { id } = ctx.params
		const result = await this.queryService.getById(id!)
		if (!result) return ctx.json({ success: false, error: this.messages.notFound() }, 404)
		return ctx.json({ success: true, data: result })
	}

	async getRefundsByOrder(ctx: IHttpContext): Promise<Response> {
		const { orderId } = ctx.params
		const results = await this.queryService.getByOrderId(orderId!)
		return ctx.json({ success: true, data: results })
	}

	async getRefundsList(ctx: IHttpContext): Promise<Response> {
		const userId = ctx.params.userId
		if (userId) {
			const results = await this.queryService.getByUserId(userId)
			return ctx.json({ success: true, data: results })
		}
		return ctx.json({ success: true, data: [] })
	}

	async approveRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ reviewerId?: string }>()
			const result = await this.refundService.approveRefund(id!, body.reviewerId)
			return ctx.json({ success: true, data: result, message: this.messages.approveSuccess() })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 400)
		}
	}

	async rejectRefund(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ reviewerId: string; note: string }>()
			if (!body.reviewerId || !body.note) {
				return ctx.json({ success: false, error: this.messages.missingRequiredFields() }, 400)
			}
			const result = await this.refundService.rejectRefund(id!, body.reviewerId, body.note)
			return ctx.json({ success: true, data: result, message: this.messages.rejectSuccess() })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 400)
		}
	}

	async shipItems(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ trackingNumber?: string }>()
			const result = await this.refundService.markItemsShipped(id!, body.trackingNumber)
			return ctx.json({ success: true, data: result, message: this.messages.itemsShippedSuccess() })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 400)
		}
	}

	async receiveItems(ctx: IHttpContext): Promise<Response> {
		try {
			const { id } = ctx.params
			const body = await ctx.getJsonBody<{ conditions: Array<{ returnItemId: string; condition: string }> }>()
			const result = await this.refundService.confirmItemsReceived(id!, body.conditions as any)
			return ctx.json({ success: true, data: result, message: this.messages.itemsReceivedSuccess() })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 400)
		}
	}

	async getPendingReviews(ctx: IHttpContext): Promise<Response> {
		const results = await this.queryService.getPendingReviews()
		return ctx.json({ success: true, data: results })
	}
}
```

- [ ] **Step 5: Create route registration**

```typescript
// app/Modules/Refund/Presentation/Routes/api.ts
import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { RefundController } from '../Controllers/RefundController'

export function registerRefundRoutes(router: IModuleRouter, controller: RefundController): void {
	router.post('/refunds', (ctx) => controller.requestRefund(ctx))
	router.get('/refunds/pending-reviews', (ctx) => controller.getPendingReviews(ctx))
	router.get('/refunds/:id', (ctx) => controller.getRefund(ctx))
	router.get('/refunds', (ctx) => controller.getRefundsList(ctx))
	router.get('/orders/:orderId/refunds', (ctx) => controller.getRefundsByOrder(ctx))
	router.post('/refunds/:id/approve', (ctx) => controller.approveRefund(ctx))
	router.post('/refunds/:id/reject', (ctx) => controller.rejectRefund(ctx))
	router.post('/refunds/:id/ship', (ctx) => controller.shipItems(ctx))
	router.post('/refunds/:id/receive', (ctx) => controller.receiveItems(ctx))
}
```

- [ ] **Step 6: Commit**

```bash
git add app/Modules/Refund/Presentation/ app/Modules/Refund/Infrastructure/Services/RefundMessageService.ts resources/lang/zh-TW/refund.json resources/lang/en/refund.json
git commit -m "feat: [Refund] Presentation 層 — Controller, Routes, IRefundMessages, i18n"
```

---

## Task 9: Infrastructure — Repository + Adapters + ServiceProvider + Wiring + index.ts

**Files:**
- Create: `app/Modules/Refund/Infrastructure/Repositories/RefundRepository.ts`
- Create: `app/Modules/Refund/Infrastructure/Adapters/OrderQueryAdapter.ts`
- Create: `app/Modules/Refund/Infrastructure/Adapters/RefundHistoryAdapter.ts`
- Create: `app/Modules/Refund/Infrastructure/Services/RefundQueryService.ts`
- Create: `app/Modules/Refund/Infrastructure/EventHandlers/PaymentRefundHandler.ts`
- Create: `app/Modules/Refund/Infrastructure/Providers/RefundServiceProvider.ts`
- Create: `app/Modules/Refund/Infrastructure/Providers/registerRefundRepositories.ts`
- Create: `app/Modules/Refund/Infrastructure/Wiring/wireRefundRoutes.ts`
- Create: `app/Modules/Refund/index.ts`

- [ ] **Step 1: Create RefundRepository** (simplified — not extending BaseEventSourcedRepository, following Payment module pattern)

```typescript
// app/Modules/Refund/Infrastructure/Repositories/RefundRepository.ts
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import { Refund } from '../../Domain/Entities/Refund'
import { ReturnItem } from '../../Domain/Entities/ReturnItem'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundStatus } from '../../Domain/ValueObjects/RefundStatus'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { Money } from '../../Domain/ValueObjects/Money'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'
import { toIntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import type { RefundCompleted } from '../../Domain/Events/RefundCompleted'
import type { ReturnItemsReceived } from '../../Domain/Events/ReturnItemsReceived'

export class RefundRepository implements IRefundRepository {
	constructor(
		private readonly db: IDatabaseAccess,
		private readonly eventDispatcher?: IEventDispatcher,
	) {}

	async save(refund: Refund): Promise<void> {
		const existing = await this.db.table('refunds').where('id', '=', refund.id).first()
		const row = this.toRow(refund)

		if (existing) {
			await this.db.table('refunds').where('id', '=', refund.id).update(row)
		} else {
			await this.db.table('refunds').insert(row)
		}

		// 保存退貨品項
		await this.db.table('refund_items').where('refund_id', '=', refund.id).delete()
		for (const item of refund.items) {
			await this.db.table('refund_items').insert(this.toItemRow(refund.id, item))
		}

		// 發佈事件
		if (this.eventDispatcher) {
			for (const event of refund.getUncommittedEvents()) {
				const integrationEvent = this.toIntegrationEvent(event)
				if (integrationEvent) {
					await this.eventDispatcher.dispatch(integrationEvent)
				}
			}
		}
		refund.markEventsAsCommitted()
	}

	async findById(id: string): Promise<Refund | null> {
		const row = await this.db.table('refunds').where('id', '=', id).first()
		if (!row) return null
		const itemRows = await this.db.table('refund_items').where('refund_id', '=', id).get()
		return this.toDomain(row, itemRows)
	}

	async delete(id: string): Promise<void> {
		await this.db.table('refund_items').where('refund_id', '=', id).delete()
		await this.db.table('refunds').where('id', '=', id).delete()
	}

	async findAll(params?: { limit?: number; offset?: number }): Promise<Refund[]> {
		let query = this.db.table('refunds').orderBy('created_at', 'desc')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)
		const rows = await query.get()
		return Promise.all(rows.map((r: any) => this.findById(r.id).then((ref) => ref!)))
	}

	async count(): Promise<number> {
		return this.db.table('refunds').count()
	}

	async findByOrderId(orderId: string): Promise<Refund[]> {
		const rows = await this.db.table('refunds').where('order_id', '=', orderId).get()
		return Promise.all(rows.map((r: any) => this.findById(r.id).then((ref) => ref!)))
	}

	async findByUserId(userId: string, params?: { limit?: number; offset?: number }): Promise<Refund[]> {
		let query = this.db.table('refunds').where('user_id', '=', userId).orderBy('created_at', 'desc')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)
		const rows = await query.get()
		return Promise.all(rows.map((r: any) => this.findById(r.id).then((ref) => ref!)))
	}

	async findByStatus(status: string, params?: { limit?: number; offset?: number }): Promise<Refund[]> {
		let query = this.db.table('refunds').where('status', '=', status).orderBy('created_at', 'desc')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)
		const rows = await query.get()
		return Promise.all(rows.map((r: any) => this.findById(r.id).then((ref) => ref!)))
	}

	private toRow(refund: Refund): Record<string, unknown> {
		return {
			id: refund.id,
			order_id: refund.orderId,
			user_id: refund.userId,
			type: refund.type.value,
			status: refund.status.value,
			calculation_json: refund.calculation ? JSON.stringify(refund.calculation) : null,
			policy_type: refund.policy?.type ?? null,
			policy_detail: refund.policy ? JSON.stringify(refund.policy) : null,
			rejection_note: refund.rejectionNote,
			requested_at: refund.requestedAt.toISOString(),
			resolved_at: refund.resolvedAt?.toISOString() ?? null,
			created_at: refund.createdAt.toISOString(),
			updated_at: new Date().toISOString(),
		}
	}

	private toItemRow(refundId: string, item: ReturnItem): Record<string, unknown> {
		return {
			id: item.id,
			refund_id: refundId,
			product_id: item.productId,
			product_name: item.productName,
			original_price_cents: item.originalPrice.cents,
			original_price_currency: item.originalPrice.currency,
			discount_share_cents: item.discountShare.cents,
			quantity: item.quantity,
			reason: item.reason.value,
			reason_description: item.reason.description,
			status: item.status,
			condition: item.condition?.value ?? null,
		}
	}

	private toDomain(row: any, itemRows: any[]): Refund {
		const items = itemRows.map((ir: any) =>
			ReturnItem.reconstitute({
				id: ir.id,
				productId: ir.product_id,
				productName: ir.product_name,
				originalPrice: Money.fromCents(ir.original_price_cents, ir.original_price_currency),
				discountShare: Money.fromCents(ir.discount_share_cents, ir.original_price_currency),
				quantity: ir.quantity,
				reason: RefundReason.from(ir.reason, ir.reason_description),
				status: ir.status,
				condition: ir.condition ? ItemCondition.from(ir.condition) : undefined,
			})
		)

		let calculation = null
		if (row.calculation_json) {
			try { calculation = JSON.parse(row.calculation_json) } catch { /* ignore */ }
		}

		let policy = null
		if (row.policy_detail) {
			try { policy = JSON.parse(row.policy_detail) } catch { /* ignore */ }
		}

		return Refund.reconstitute({
			id: row.id,
			orderId: row.order_id,
			userId: row.user_id,
			type: RefundType.from(row.type),
			status: RefundStatus.from(row.status),
			items,
			calculation,
			policy,
			rejectionNote: row.rejection_note,
			requestedAt: new Date(row.requested_at),
			resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
		})
	}

	private toIntegrationEvent(event: any) {
		if (event.eventType === 'RefundCompleted') {
			return toIntegrationEvent('RefundCompleted', 'Refund', {
				refundId: event.refundId,
				orderId: event.orderId,
				refundAmountCents: event.refundAmountCents,
				currency: event.currency,
			}, event.refundId)
		}
		if (event.eventType === 'ReturnItemsReceived') {
			return toIntegrationEvent('ReturnItemsReceived', 'Refund', {
				refundId: event.refundId,
			}, event.refundId)
		}
		if (event.eventType === 'RefundProcessing') {
			return toIntegrationEvent('RefundProcessing', 'Refund', {
				refundId: event.refundId,
				refundAmountCents: event.refundAmountCents,
				currency: event.currency,
			}, event.refundId)
		}
		return null
	}
}
```

- [ ] **Step 2: Create adapters**

```typescript
// app/Modules/Refund/Infrastructure/Adapters/OrderQueryAdapter.ts
import type { IOrderQueryPort } from '../../Domain/Ports/IOrderQueryPort'
import { OrderContext, type OrderLineSnapshot } from '../../Domain/ValueObjects/OrderContext'

export class OrderQueryAdapter implements IOrderQueryPort {
	constructor(private readonly orderRepository: any) {}

	async getOrderContext(orderId: string): Promise<OrderContext> {
		const order = await this.orderRepository.findById(orderId)
		if (!order) throw new Error(`訂單不存在: ${orderId}`)

		const items: OrderLineSnapshot[] = (order.orderLines ?? order.items ?? []).map((line: any) => ({
			orderLineId: line.id ?? line.orderLineId,
			productId: line.productId,
			productName: line.productName ?? line.productId,
			unitPriceCents: line.unitPrice?.cents ?? line.price ?? 0,
			quantity: line.quantity?.value ?? line.quantity ?? 1,
		}))

		return OrderContext.create({
			orderId: order.id,
			orderDate: order.createdAt ?? new Date(),
			totalAmountCents: order.totalAmount?.cents ?? 0,
			discountAmountCents: order.discountAmount?.cents ?? 0,
			currency: order.totalAmount?.currency ?? 'TWD',
			paymentMethod: order.paymentMethod ?? 'unknown',
			items,
		})
	}
}
```

```typescript
// app/Modules/Refund/Infrastructure/Adapters/RefundHistoryAdapter.ts
import type { IRefundHistoryPort } from '../../Domain/Ports/IRefundHistoryPort'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'

export class RefundHistoryAdapter implements IRefundHistoryPort {
	constructor(private readonly refundRepository: IRefundRepository) {}

	async countRecentRefunds(userId: string, withinDays: number): Promise<number> {
		const refunds = await this.refundRepository.findByUserId(userId)
		const cutoff = new Date(Date.now() - withinDays * 86400000)
		return refunds.filter((r) => r.requestedAt >= cutoff).length
	}
}
```

- [ ] **Step 3: Create RefundQueryService**

```typescript
// app/Modules/Refund/Infrastructure/Services/RefundQueryService.ts
import type { IRefundQueryService } from '../../Application/Queries/IRefundQueryService'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import { type RefundDTO, toRefundDTO } from '../../Application/DTOs/RefundDTO'

export class RefundQueryService implements IRefundQueryService {
	constructor(private readonly refundRepository: IRefundRepository) {}

	async getById(refundId: string): Promise<RefundDTO | null> {
		const refund = await this.refundRepository.findById(refundId)
		return refund ? toRefundDTO(refund) : null
	}

	async getByOrderId(orderId: string): Promise<RefundDTO[]> {
		const refunds = await this.refundRepository.findByOrderId(orderId)
		return refunds.map(toRefundDTO)
	}

	async getByUserId(userId: string, pagination?: { limit?: number; offset?: number }): Promise<RefundDTO[]> {
		const refunds = await this.refundRepository.findByUserId(userId, pagination)
		return refunds.map(toRefundDTO)
	}

	async getPendingReviews(pagination?: { limit?: number; offset?: number }): Promise<RefundDTO[]> {
		const refunds = await this.refundRepository.findByStatus('under_review', pagination)
		return refunds.map(toRefundDTO)
	}
}
```

- [ ] **Step 4: Create PaymentRefundHandler**

```typescript
// app/Modules/Refund/Infrastructure/EventHandlers/PaymentRefundHandler.ts
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

export class PaymentRefundHandler {
	constructor(
		private readonly refundRepository: IRefundRepository,
		private readonly logger: ILogger,
	) {}

	async handlePaymentRefunded(event: any): Promise<void> {
		const payload = event.data || event
		const refundId = payload.refundId
		if (!refundId) {
			this.logger.warn('[PaymentRefundHandler] Missing refundId in PaymentRefunded event')
			return
		}

		const refund = await this.refundRepository.findById(refundId)
		if (!refund) {
			this.logger.warn(`[PaymentRefundHandler] Refund not found: ${refundId}`)
			return
		}

		try {
			refund.complete()
			await this.refundRepository.save(refund)
			this.logger.info(`[PaymentRefundHandler] Refund completed: ${refundId}`)
		} catch (error) {
			this.logger.error(`[PaymentRefundHandler] Failed to complete refund: ${refundId}`, error)
		}
	}

	async handlePaymentRefundFailed(event: any): Promise<void> {
		const payload = event.data || event
		const refundId = payload.refundId
		if (!refundId) return

		const refund = await this.refundRepository.findById(refundId)
		if (!refund) return

		try {
			refund.fail(payload.reason ?? 'Payment refund failed')
			await this.refundRepository.save(refund)
			this.logger.info(`[PaymentRefundHandler] Refund failed: ${refundId}`)
		} catch (error) {
			this.logger.error(`[PaymentRefundHandler] Failed to mark refund as failed: ${refundId}`, error)
		}
	}
}
```

- [ ] **Step 5: Create ServiceProvider + registerRepositories + wiring + index.ts**

```typescript
// app/Modules/Refund/Infrastructure/Providers/RefundServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'
import { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import { RefundQueryService } from '../Services/RefundQueryService'
import { RefundMessageService } from '../Services/RefundMessageService'
import { OrderQueryAdapter } from '../Adapters/OrderQueryAdapter'
import { RefundHistoryAdapter } from '../Adapters/RefundHistoryAdapter'
import { PaymentRefundHandler } from '../EventHandlers/PaymentRefundHandler'
import { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import { RefundFees } from '../../Domain/ValueObjects/RefundFees'
import { Money } from '../../Domain/ValueObjects/Money'
import { EventListenerRegistry } from '@/Foundation/Infrastructure/Registries/EventListenerRegistry'

export class RefundServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		container.singleton('refundRepository', (c: IContainer) => {
			const registry = c.make('repositoryRegistry') as RepositoryRegistry
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('refund', orm, db)
		})

		container.singleton('refundMessages', (c) => {
			try {
				const translator = c.make('translator') as ITranslator
				return new RefundMessageService(translator)
			} catch {
				const fallback: any = { trans: (key: string) => key, choice: (key: string) => key, setLocale: () => {}, getLocale: () => 'en' }
				return new RefundMessageService(fallback)
			}
		})

		container.singleton('orderQueryAdapter', (c) => {
			const orderRepository = c.make('orderRepository')
			return new OrderQueryAdapter(orderRepository)
		})

		container.singleton('refundHistoryAdapter', (c) => {
			const refundRepository = c.make('refundRepository')
			return new RefundHistoryAdapter(refundRepository)
		})

		container.singleton('refundQueryService', (c) => {
			const refundRepository = c.make('refundRepository')
			return new RefundQueryService(refundRepository)
		})

		container.singleton('refundApplicationService', (c) => {
			const refundRepository = c.make('refundRepository')
			const orderQuery = c.make('orderQueryAdapter')
			const refundHistory = c.make('refundHistoryAdapter')
			const policyConfig = RefundPolicyConfig.defaults()
			const fees = RefundFees.create(0.1, Money.fromCents(500, 'TWD'), ['defective', 'wrong_item'])
			return new RefundApplicationService(refundRepository, orderQuery, refundHistory, policyConfig, fees)
		})

		container.singleton('paymentRefundHandler', (c) => {
			const refundRepository = c.make('refundRepository')
			const logger = c.make('logger') as ILogger
			return new PaymentRefundHandler(refundRepository, logger)
		})

		EventListenerRegistry.register({
			moduleName: 'Refund',
			listeners: [
				{
					eventName: 'PaymentRefunded',
					handlerFactory: (c) => {
						const handler = c.make('paymentRefundHandler') as PaymentRefundHandler
						return (event) => handler.handlePaymentRefunded(event)
					},
				},
				{
					eventName: 'PaymentRefundFailed',
					handlerFactory: (c) => {
						const handler = c.make('paymentRefundHandler') as PaymentRefundHandler
						return (event) => handler.handlePaymentRefundFailed(event)
					},
				},
			],
		})
	}

	override boot(context: any): void {
		const container = context.container ?? context
		const logger = container.make('logger') as ILogger | undefined
		if (process.env.NODE_ENV === 'development') {
			const message = '✨ [Refund] Module loaded'
			logger?.info?.(message) || console.log(message)
		}
	}
}
```

```typescript
// app/Modules/Refund/Infrastructure/Providers/registerRefundRepositories.ts
import { RefundRepository } from '../Repositories/RefundRepository'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'

export function registerRefundRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher, registry?: RepositoryRegistry): void {
	if (!registry) throw new Error("RepositoryRegistry not provided")

	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new RefundRepository(db, eventDispatcher)
	}

	registry.register('refund', factory)
}
```

```typescript
// app/Modules/Refund/Infrastructure/Wiring/wireRefundRoutes.ts
import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import type { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import type { IRefundQueryService } from '../../Application/Queries/IRefundQueryService'
import type { IRefundMessages } from '@/Modules/Refund/Presentation/Ports/IRefundMessages'
import { RefundController } from '../../Presentation/Controllers/RefundController'
import { registerRefundRoutes } from '../../Presentation/Routes/api'

export function wireRefundRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	let refundService: RefundApplicationService
	let queryService: IRefundQueryService
	let messages: IRefundMessages

	try {
		refundService = ctx.container.make('refundApplicationService') as RefundApplicationService
		queryService = ctx.container.make('refundQueryService') as IRefundQueryService
		messages = ctx.container.make('refundMessages') as IRefundMessages
	} catch (error) {
		console.warn('[wireRefundRoutes] Warning: Services not ready, skipping route registration')
		return
	}

	const controller = new RefundController(refundService, queryService, messages)
	registerRefundRoutes(router, controller)
}
```

```typescript
// app/Modules/Refund/index.ts
import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { RefundServiceProvider } from './Infrastructure/Providers/RefundServiceProvider'
import { registerRefundRepositories } from './Infrastructure/Providers/registerRefundRepositories'
import { wireRefundRoutes } from './Infrastructure/Wiring/wireRefundRoutes'

// Domain
export { Refund } from './Domain/Entities/Refund'
export { ReturnItem } from './Domain/Entities/ReturnItem'
export { RefundId } from './Domain/ValueObjects/RefundId'
export { RefundType } from './Domain/ValueObjects/RefundType'
export { RefundStatus } from './Domain/ValueObjects/RefundStatus'
export { RefundReason } from './Domain/ValueObjects/RefundReason'
export { Money } from './Domain/ValueObjects/Money'
export { RefundCalculation } from './Domain/ValueObjects/RefundCalculation'
export { PolicyDecision } from './Domain/ValueObjects/PolicyDecision'
export type { IRefundRepository } from './Domain/Repositories/IRefundRepository'
export type { IOrderQueryPort } from './Domain/Ports/IOrderQueryPort'

// Domain Events
export { RefundRequested } from './Domain/Events/RefundRequested'
export { RefundCompleted } from './Domain/Events/RefundCompleted'
export { RefundFailed } from './Domain/Events/RefundFailed'

// Application
export { RefundApplicationService } from './Application/Services/RefundApplicationService'
export type { IRefundQueryService } from './Application/Queries/IRefundQueryService'
export type { CreateRefundDTO } from './Application/DTOs/CreateRefundDTO'
export type { RefundDTO } from './Application/DTOs/RefundDTO'
export { toRefundDTO } from './Application/DTOs/RefundDTO'

// Infrastructure
export { RefundRepository } from './Infrastructure/Repositories/RefundRepository'
export { RefundServiceProvider } from './Infrastructure/Providers/RefundServiceProvider'

// Presentation
export { RefundController } from './Presentation/Controllers/RefundController'
export { registerRefundRoutes } from './Presentation/Routes/api'

export const RefundModule: IModuleDefinition = {
	name: 'Refund',
	provider: RefundServiceProvider,
	registerRepositories: registerRefundRepositories,
	registerRoutes: wireRefundRoutes,
}
```

- [ ] **Step 6: Commit**

```bash
git add app/Modules/Refund/Infrastructure/ app/Modules/Refund/index.ts
git commit -m "feat: [Refund] Infrastructure 層 — Repository, Adapters, ServiceProvider, Wiring, Module 定義"
```

---

## Task 10: RefundSaga — 跨模組協調

**Files:**
- Create: `app/Modules/Refund/Application/Sagas/RefundSaga.ts`
- Test: `app/Modules/Refund/tests/Integration/RefundSaga.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// app/Modules/Refund/tests/Integration/RefundSaga.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SequentialSaga } from '@/Foundation/Infrastructure/Sagas/SequentialSaga'
import { createRefundSaga, type RefundSagaInput } from '../../Application/Sagas/RefundSaga'

describe('RefundSaga', () => {
	let mockOrderService: any
	let mockInventoryPort: any
	let mockPaymentService: any
	let mockRefundRepository: any

	beforeEach(() => {
		mockOrderService = { markRefunding: vi.fn().mockResolvedValue(undefined), restoreStatus: vi.fn().mockResolvedValue(undefined) }
		mockInventoryPort = { restoreStock: vi.fn().mockResolvedValue(undefined), deductStock: vi.fn().mockResolvedValue(undefined) }
		mockPaymentService = { refund: vi.fn().mockResolvedValue('txn-refund-1') }
		mockRefundRepository = { findById: vi.fn(), save: vi.fn().mockResolvedValue(undefined) }
	})

	const input: RefundSagaInput = {
		refundId: 'refund-1',
		orderId: 'order-1',
		paymentId: 'payment-1',
		refundAmountCents: 5000,
		currency: 'TWD',
		restoreInventory: true,
		inventoryItems: [{ productId: 'p1', quantity: 2 }],
	}

	it('正向完成：所有步驟成功', async () => {
		const saga = createRefundSaga(mockOrderService, mockInventoryPort, mockPaymentService)
		const context = await saga.execute(input)

		expect(context.error).toBeUndefined()
		expect(mockOrderService.markRefunding).toHaveBeenCalledWith('order-1')
		expect(mockInventoryPort.restoreStock).toHaveBeenCalledWith('p1', 2)
		expect(mockPaymentService.refund).toHaveBeenCalledWith('payment-1', 5000, 'TWD')
	})

	it('Payment 失敗：應該補償 Order 和 Inventory', async () => {
		mockPaymentService.refund.mockRejectedValueOnce(new Error('Payment gateway error'))

		const saga = createRefundSaga(mockOrderService, mockInventoryPort, mockPaymentService)
		const context = await saga.execute(input)

		expect(context.error?.message).toBe('Payment gateway error')
		expect(mockOrderService.restoreStatus).toHaveBeenCalled()
		expect(mockInventoryPort.deductStock).toHaveBeenCalledWith('p1', 2)
	})

	it('Inventory 失敗：應該補償 Order', async () => {
		mockInventoryPort.restoreStock.mockRejectedValueOnce(new Error('庫存不足'))

		const saga = createRefundSaga(mockOrderService, mockInventoryPort, mockPaymentService)
		const context = await saga.execute(input)

		expect(context.error?.message).toBe('庫存不足')
		expect(mockOrderService.restoreStatus).toHaveBeenCalled()
		expect(mockPaymentService.refund).not.toHaveBeenCalled()
	})

	it('不需要庫存回補時跳過 Inventory 步驟', async () => {
		const inputNoInventory = { ...input, restoreInventory: false }
		const saga = createRefundSaga(mockOrderService, mockInventoryPort, mockPaymentService)
		const context = await saga.execute(inputNoInventory)

		expect(context.error).toBeUndefined()
		expect(mockInventoryPort.restoreStock).not.toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && npx vitest run app/Modules/Refund/tests/Integration/RefundSaga.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement RefundSaga**

```typescript
// app/Modules/Refund/Application/Sagas/RefundSaga.ts
import { SequentialSaga } from '@/Foundation/Infrastructure/Sagas/SequentialSaga'
import type { ISagaStep, SagaContext } from '@/Foundation/Application/Sagas/ISaga'

export interface RefundSagaInput {
	refundId: string
	orderId: string
	paymentId: string
	refundAmountCents: number
	currency: string
	restoreInventory: boolean
	inventoryItems: Array<{ productId: string; quantity: number }>
}

interface IOrderRefundService {
	markRefunding(orderId: string): Promise<void>
	restoreStatus(orderId: string): Promise<void>
}

interface IInventoryRefundPort {
	restoreStock(productId: string, quantity: number): Promise<void>
	deductStock(productId: string, quantity: number): Promise<void>
}

interface IPaymentRefundService {
	refund(paymentId: string, amountCents: number, currency: string): Promise<string>
}

class UpdateOrderStatusStep implements ISagaStep<RefundSagaInput> {
	readonly name = 'UpdateOrderStatus'
	constructor(private orderService: IOrderRefundService) {}

	async execute(input: RefundSagaInput): Promise<void> {
		await this.orderService.markRefunding(input.orderId)
	}

	async compensate(context: SagaContext): Promise<void> {
		const input = context.results.get('__input') as RefundSagaInput | undefined
		if (input) await this.orderService.restoreStatus(input.orderId)
	}
}

class RestoreInventoryStep implements ISagaStep<RefundSagaInput> {
	readonly name = 'RestoreInventory'
	constructor(private inventoryPort: IInventoryRefundPort) {}

	async execute(input: RefundSagaInput): Promise<void> {
		if (!input.restoreInventory) return
		for (const item of input.inventoryItems) {
			await this.inventoryPort.restoreStock(item.productId, item.quantity)
		}
	}

	async compensate(context: SagaContext): Promise<void> {
		const input = context.results.get('__input') as RefundSagaInput | undefined
		if (!input?.restoreInventory) return
		for (const item of input.inventoryItems) {
			await this.inventoryPort.deductStock(item.productId, item.quantity)
		}
	}
}

class ProcessPaymentRefundStep implements ISagaStep<RefundSagaInput> {
	readonly name = 'ProcessPaymentRefund'
	constructor(private paymentService: IPaymentRefundService) {}

	async execute(input: RefundSagaInput): Promise<string> {
		return this.paymentService.refund(input.paymentId, input.refundAmountCents, input.currency)
	}

	async compensate(): Promise<void> {
		// Payment refund 無法補償，由外部標記 Failed
	}
}

export function createRefundSaga(
	orderService: IOrderRefundService,
	inventoryPort: IInventoryRefundPort,
	paymentService: IPaymentRefundService,
): SequentialSaga {
	const steps: ISagaStep[] = [
		new UpdateOrderStatusStep(orderService),
		new RestoreInventoryStep(inventoryPort),
		new ProcessPaymentRefundStep(paymentService),
	]

	// Wrap execute to store input in context for compensation
	const saga = new SequentialSaga(steps)
	const originalExecute = saga.execute.bind(saga)
	saga.execute = async (input: unknown, correlationId?: string) => {
		const context = await originalExecute(input, correlationId)
		return context
	}

	return saga
}
```

Note: The SequentialSaga passes `input` to all steps, so compensation steps need the input too. Looking at the SequentialSaga code, `step.compensate(context)` only receives context. The input is NOT automatically stored. We need to store it in context.results inside the first step. Let me fix the approach:

```typescript
// Updated: Use a wrapper step that stores input
class StoreInputStep implements ISagaStep<RefundSagaInput> {
	readonly name = '__input'
	async execute(input: RefundSagaInput): Promise<RefundSagaInput> { return input }
	async compensate(): Promise<void> {}
}

export function createRefundSaga(
	orderService: IOrderRefundService,
	inventoryPort: IInventoryRefundPort,
	paymentService: IPaymentRefundService,
): SequentialSaga {
	return new SequentialSaga([
		new StoreInputStep(),
		new UpdateOrderStatusStep(orderService),
		new RestoreInventoryStep(inventoryPort),
		new ProcessPaymentRefundStep(paymentService),
	])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && npx vitest run app/Modules/Refund/tests/Integration/RefundSaga.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add app/Modules/Refund/Application/Sagas/ app/Modules/Refund/tests/Integration/RefundSaga.test.ts
git commit -m "feat: [Refund] RefundSaga — 跨模組協調（Order 狀態 + Inventory 回補 + Payment 退款）"
```

---

## Task 11: Integration Tests — Repository + Event Handlers

**Files:**
- Test: `app/Modules/Refund/tests/Integration/RefundRepository.test.ts`
- Test: `app/Modules/Refund/tests/Integration/RefundEventHandlers.test.ts`

- [ ] **Step 1: Write RefundRepository integration tests**

These tests use the memory ORM adapter (same pattern as existing tests). Create tests that verify CRUD, findByOrderId, findByUserId, findByStatus.

- [ ] **Step 2: Write RefundEventHandlers integration tests**

Test that PaymentRefundHandler correctly transitions Refund to Completed or Failed when receiving PaymentRefunded / PaymentRefundFailed events.

- [ ] **Step 3: Run all tests**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/tests/ && npx vitest run app/Modules/Refund/tests/`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add app/Modules/Refund/tests/Integration/
git commit -m "test: [Refund] Integration tests — Repository CRUD + Event Handler 狀態轉換"
```

---

## Task 12: E2E Test — 完整退款流程

**Files:**
- Test: `app/Modules/Refund/tests/E2E/RefundFlow.test.ts`

- [ ] **Step 1: Write E2E test covering full refund flow**

Test the complete flow: create refund → auto-approve → process payment → complete. Also test: return flow, partial refund, rejection, saga compensation, abuse prevention.

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test app/Modules/Refund/ && npx vitest run app/Modules/Refund/`
Expected: ALL PASS (~45 tests)

- [ ] **Step 3: Commit**

```bash
git add app/Modules/Refund/tests/E2E/
git commit -m "test: [Refund] E2E tests — 完整退款流程、部分退貨、Saga 補償、防濫用"
```

---

## Task 13: Final — TypeScript 編譯驗證 + 全部測試通過

- [ ] **Step 1: Run TypeScript compiler check**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run full project test suite**

Run: `cd /Users/carl/Dev/CMG/gravito-ddd && bun test`
Expected: All tests pass including existing tests

- [ ] **Step 3: Fix any compilation or test errors**

Address issues found in Step 1-2.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: [Refund] 完成 Refund 模組 — Domain, Application, Presentation, Infrastructure, 45+ 測試"
```
