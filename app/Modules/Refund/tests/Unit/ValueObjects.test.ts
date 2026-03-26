import { describe, it, expect } from 'bun:test'
import { Money } from '@/Modules/Refund/Domain/ValueObjects/Money'
import { RefundId } from '@/Modules/Refund/Domain/ValueObjects/RefundId'
import { RefundType } from '@/Modules/Refund/Domain/ValueObjects/RefundType'
import { RefundReason } from '@/Modules/Refund/Domain/ValueObjects/RefundReason'
import { ItemCondition } from '@/Modules/Refund/Domain/ValueObjects/ItemCondition'

// ============================================================
// Money
// ============================================================
describe('Money', () => {
	it('fromCents 應儲存整數分', () => {
		const m = Money.fromCents(1000, 'TWD')
		expect(m.cents).toBe(1000)
		expect(m.currency).toBe('TWD')
	})

	it('fromDollars 應轉換為分', () => {
		const m = Money.fromDollars(10.5, 'TWD')
		expect(m.cents).toBe(1050)
		expect(m.currency).toBe('TWD')
	})

	it('zero 應回傳 0 分', () => {
		const m = Money.zero('USD')
		expect(m.cents).toBe(0)
		expect(m.currency).toBe('USD')
	})

	it('add 應相加並回傳新 Money', () => {
		const a = Money.fromCents(500, 'TWD')
		const b = Money.fromCents(300, 'TWD')
		const result = a.add(b)
		expect(result.cents).toBe(800)
		expect(result.currency).toBe('TWD')
	})

	it('subtract 應相減並回傳新 Money', () => {
		const a = Money.fromCents(1000, 'TWD')
		const b = Money.fromCents(400, 'TWD')
		const result = a.subtract(b)
		expect(result.cents).toBe(600)
	})

	it('multiplyByRate 應乘以比率並回傳新 Money', () => {
		const m = Money.fromCents(1000, 'TWD')
		const result = m.multiplyByRate(0.5)
		expect(result.cents).toBe(500)
	})

	it('幣別不一致時 add 應拋出錯誤', () => {
		const a = Money.fromCents(100, 'TWD')
		const b = Money.fromCents(100, 'USD')
		expect(() => a.add(b)).toThrow('幣別不一致')
	})

	it('幣別不一致時 subtract 應拋出錯誤', () => {
		const a = Money.fromCents(100, 'TWD')
		const b = Money.fromCents(50, 'USD')
		expect(() => a.subtract(b)).toThrow('幣別不一致')
	})

	it('equals 應比較相同值', () => {
		const a = Money.fromCents(999, 'TWD')
		const b = Money.fromCents(999, 'TWD')
		const c = Money.fromCents(999, 'USD')
		expect(a.equals(b)).toBe(true)
		expect(a.equals(c)).toBe(false)
	})

	it('toString 應回傳可讀字串', () => {
		const m = Money.fromCents(1234, 'TWD')
		expect(m.toString()).toBe('TWD 1234')
	})
})

// ============================================================
// RefundId
// ============================================================
describe('RefundId', () => {
	it('create 應自動產生 UUID', () => {
		const id = RefundId.create()
		expect(id.value).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		)
	})

	it('create 每次應產生不同的 UUID', () => {
		const a = RefundId.create()
		const b = RefundId.create()
		expect(a.value).not.toBe(b.value)
	})

	it('from 應從字串建立 RefundId', () => {
		const id = RefundId.from('refund-abc-123')
		expect(id.value).toBe('refund-abc-123')
	})

	it('equals 應比較相同值', () => {
		const a = RefundId.from('same-id')
		const b = RefundId.from('same-id')
		const c = RefundId.from('diff-id')
		expect(a.equals(b)).toBe(true)
		expect(a.equals(c)).toBe(false)
	})

	it('toString 應回傳 value', () => {
		const id = RefundId.from('test-id-001')
		expect(id.toString()).toBe('test-id-001')
	})
})

// ============================================================
// RefundType
// ============================================================
describe('RefundType', () => {
	it('refundOnly 應建立僅退款類型', () => {
		const t = RefundType.refundOnly()
		expect(t.value).toBe('refund_only')
		expect(t.isRefundOnly()).toBe(true)
		expect(t.isReturnAndRefund()).toBe(false)
	})

	it('returnAndRefund 應建立退貨退款類型', () => {
		const t = RefundType.returnAndRefund()
		expect(t.value).toBe('return_and_refund')
		expect(t.isReturnAndRefund()).toBe(true)
		expect(t.isRefundOnly()).toBe(false)
	})

	it('from 應從有效字串建立', () => {
		expect(RefundType.from('refund_only').value).toBe('refund_only')
		expect(RefundType.from('return_and_refund').value).toBe('return_and_refund')
	})

	it('from 傳入無效字串應拋出錯誤', () => {
		expect(() => RefundType.from('invalid_type')).toThrow()
	})

	it('equals 應比較相同值', () => {
		expect(RefundType.refundOnly().equals(RefundType.refundOnly())).toBe(true)
		expect(RefundType.refundOnly().equals(RefundType.returnAndRefund())).toBe(false)
	})
})

// ============================================================
// RefundReason
// ============================================================
describe('RefundReason', () => {
	it('defective 應建立商品瑕疵原因', () => {
		const r = RefundReason.defective()
		expect(r.value).toBe('defective')
		expect(r.isOther()).toBe(false)
	})

	it('wrongItem 應建立商品錯誤原因', () => {
		const r = RefundReason.wrongItem()
		expect(r.value).toBe('wrong_item')
	})

	it('notAsDescribed 應建立與描述不符原因', () => {
		const r = RefundReason.notAsDescribed()
		expect(r.value).toBe('not_as_described')
	})

	it('changeOfMind 應建立改變心意原因', () => {
		const r = RefundReason.changeOfMind()
		expect(r.value).toBe('change_of_mind')
	})

	it('other 應建立其他原因並帶描述', () => {
		const r = RefundReason.other('買錯尺寸了')
		expect(r.value).toBe('other')
		expect(r.description).toBe('買錯尺寸了')
		expect(r.isOther()).toBe(true)
	})

	it('from 應從有效字串建立', () => {
		expect(RefundReason.from('defective').value).toBe('defective')
		expect(RefundReason.from('wrong_item').value).toBe('wrong_item')
		expect(RefundReason.from('other', '說明').description).toBe('說明')
	})

	it('from 傳入無效字串應拋出錯誤', () => {
		expect(() => RefundReason.from('invalid_reason')).toThrow()
	})

	it('equals 應比較相同值', () => {
		expect(RefundReason.defective().equals(RefundReason.defective())).toBe(true)
		expect(RefundReason.defective().equals(RefundReason.wrongItem())).toBe(false)
		expect(
			RefundReason.other('同樣說明').equals(RefundReason.other('同樣說明'))
		).toBe(true)
		expect(
			RefundReason.other('說明A').equals(RefundReason.other('說明B'))
		).toBe(false)
	})
})

// ============================================================
// ItemCondition
// ============================================================
describe('ItemCondition', () => {
	it('good 應建立良好狀態', () => {
		const c = ItemCondition.good()
		expect(c.value).toBe('good')
	})

	it('damaged 應建立損壞狀態', () => {
		const c = ItemCondition.damaged()
		expect(c.value).toBe('damaged')
	})

	it('missing 應建立遺失狀態', () => {
		const c = ItemCondition.missing()
		expect(c.value).toBe('missing')
	})

	it('from 應從有效字串建立', () => {
		expect(ItemCondition.from('good').value).toBe('good')
		expect(ItemCondition.from('damaged').value).toBe('damaged')
		expect(ItemCondition.from('missing').value).toBe('missing')
	})

	it('from 傳入無效字串應拋出錯誤', () => {
		expect(() => ItemCondition.from('broken')).toThrow()
	})

	it('equals 應比較相同值', () => {
		expect(ItemCondition.good().equals(ItemCondition.good())).toBe(true)
		expect(ItemCondition.good().equals(ItemCondition.damaged())).toBe(false)
	})

	it('toString 應回傳 value', () => {
		expect(ItemCondition.missing().toString()).toBe('missing')
	})
})
