import { describe, it, expect } from 'bun:test'
import { RefundCalculator } from '../../Domain/Services/RefundCalculator'
import { ReturnItem } from '../../Domain/Entities/ReturnItem'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { RefundFees } from '../../Domain/ValueObjects/RefundFees'
import { OrderContext } from '../../Domain/ValueObjects/OrderContext'

// ── 測試輔助函數 ──────────────────────────────────────────────

function makeReturnItem(
	productId: string,
	priceCents: number,
	quantity: number,
	reason: RefundReason = RefundReason.changeOfMind()
): ReturnItem {
	return ReturnItem.create({
		productId,
		productName: `商品 ${productId}`,
		originalPrice: Money.fromCents(priceCents, 'TWD'),
		discountShare: Money.zero('TWD'),
		quantity,
		reason,
	})
}

function makeOrderContext(
	totalCents: number,
	discountCents = 0,
	currency = 'TWD'
): OrderContext {
	return OrderContext.create({
		orderId: 'order-calc-test',
		orderDate: new Date(),
		totalAmountCents: totalCents,
		discountAmountCents: discountCents,
		currency,
		paymentMethod: 'credit_card',
		items: [],
	})
}

function makeStandardFees(): RefundFees {
	// restockingFeeRate=0.1 (10%), shippingFee=200 分, waivedReasons=['defective','wrong_item']
	return RefundFees.create(0.1, Money.fromCents(200, 'TWD'), ['defective', 'wrong_item'])
}

// ── 測試本體 ─────────────────────────────────────────────────

const calculator = new RefundCalculator()

describe('RefundCalculator.calculate()', () => {
	it('無折扣、有費用 → 正確計算小計/補貨費/運費/退款金額', () => {
		const items = [makeReturnItem('p1', 5000, 1)]
		const orderContext = makeOrderContext(5000, 0)
		const fees = makeStandardFees()

		const calc = calculator.calculate(items, orderContext, fees)

		// subtotal = 5000, restocking = 500 (10%), shipping = 200
		expect(calc.subtotalCents).toBe(5000)
		expect(calc.restockingFeeCents).toBe(500)
		expect(calc.shippingFeeCents).toBe(200)
		expect(calc.totalDeductionsCents).toBe(700)
		expect(calc.refundAmountCents).toBe(4300)
		expect(calc.currency).toBe('TWD')
	})

	it('有折扣 → 按比例分攤折扣', () => {
		// 訂單總額 10000，折扣 2000；退款商品 5000（佔 50%）
		const items = [makeReturnItem('p1', 5000, 1)]
		const orderContext = makeOrderContext(10000, 2000)
		const fees = makeStandardFees()

		const calc = calculator.calculate(items, orderContext, fees)

		// discountShare = round(2000 * 0.5) = 1000
		// adjustedPrice = 5000 - 1000 = 4000
		// restocking = round(4000 * 0.1) = 400
		// shipping = 200
		// refundAmount = 4000 - 400 - 200 = 3400
		expect(calc.subtotalCents).toBe(4000)
		expect(calc.restockingFeeCents).toBe(400)
		expect(calc.shippingFeeCents).toBe(200)
		expect(calc.refundAmountCents).toBe(3400)
	})

	it('瑕疵品原因 → 費用豁免（補貨費=0、運費=0）', () => {
		const items = [makeReturnItem('p1', 5000, 1, RefundReason.defective())]
		const orderContext = makeOrderContext(5000, 0)
		const fees = makeStandardFees() // defective is waived

		const calc = calculator.calculate(items, orderContext, fees)

		expect(calc.restockingFeeCents).toBe(0)
		expect(calc.shippingFeeCents).toBe(0)
		expect(calc.refundAmountCents).toBe(5000)
	})

	it('數量大於 1 → 正確計算', () => {
		// 單價 1000，數量 3 → 總額 3000
		const items = [makeReturnItem('p1', 1000, 3)]
		const orderContext = makeOrderContext(3000, 0)
		const fees = makeStandardFees()

		const calc = calculator.calculate(items, orderContext, fees)

		// subtotal = 3000, restocking = 300, shipping = 200
		expect(calc.subtotalCents).toBe(3000)
		expect(calc.restockingFeeCents).toBe(300)
		expect(calc.shippingFeeCents).toBe(200)
		expect(calc.refundAmountCents).toBe(2500)
	})

	it('多商品有折扣 → 按各商品比例分攤', () => {
		// 訂單總額 10000，折扣 1000
		// 商品A: 6000 (佔 60%), 商品B: 4000 (佔 40%)
		const items = [
			makeReturnItem('pA', 6000, 1),
			makeReturnItem('pB', 4000, 1),
		]
		const orderContext = makeOrderContext(10000, 1000)
		const fees = makeStandardFees()

		const calc = calculator.calculate(items, orderContext, fees)

		// discountShareA = round(1000 * 0.6) = 600 → adjustedA = 5400
		// discountShareB = round(1000 * 0.4) = 400 → adjustedB = 3600
		// subtotal = 9000
		// restocking = round(9000 * 0.1) = 900
		// shipping = 200
		// refundAmount = 9000 - 900 - 200 = 7900
		expect(calc.subtotalCents).toBe(9000)
		expect(calc.restockingFeeCents).toBe(900)
		expect(calc.shippingFeeCents).toBe(200)
		expect(calc.refundAmountCents).toBe(7900)
		expect(calc.breakdown).toHaveLength(2)
	})

	it('整數精度測試 — 無浮點數誤差', () => {
		// 訂單 10000，折扣 333 (奇數測試精度)
		// 商品: 5000 (佔 50%)
		const items = [makeReturnItem('p1', 5000, 1)]
		const orderContext = makeOrderContext(10000, 333)
		const fees = makeStandardFees()

		const calc = calculator.calculate(items, orderContext, fees)

		// 所有金額都應該是整數
		expect(Number.isInteger(calc.subtotalCents)).toBe(true)
		expect(Number.isInteger(calc.restockingFeeCents)).toBe(true)
		expect(Number.isInteger(calc.shippingFeeCents)).toBe(true)
		expect(Number.isInteger(calc.refundAmountCents)).toBe(true)

		// discountShare = round(333 * 0.5) = round(166.5) = 167
		// adjusted = 5000 - 167 = 4833
		expect(calc.subtotalCents).toBe(4833)
	})
})
