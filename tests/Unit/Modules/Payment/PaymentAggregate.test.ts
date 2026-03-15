import { describe, it, expect, beforeEach } from 'bun:test'
import { Payment } from '@/Modules/Payment/Domain/Aggregates/Payment'
import { PaymentId } from '@/Modules/Payment/Domain/ValueObjects/PaymentId'
import { TransactionId } from '@/Modules/Payment/Domain/ValueObjects/TransactionId'
import { Amount } from '@/Modules/Payment/Domain/ValueObjects/Amount'
import { PaymentMethod } from '@/Modules/Payment/Domain/ValueObjects/PaymentMethod'
import { PaymentStatus } from '@/Modules/Payment/Domain/ValueObjects/PaymentStatus'
import { PaymentInitiated } from '@/Modules/Payment/Domain/Events/PaymentInitiated'
import { PaymentSucceeded } from '@/Modules/Payment/Domain/Events/PaymentSucceeded'
import { PaymentFailed } from '@/Modules/Payment/Domain/Events/PaymentFailed'

describe('Payment Aggregate', () => {
	let payment: Payment

	beforeEach(() => {
		const amount = new Amount(50000) // 500 元
		const method = PaymentMethod.creditCard()
		payment = Payment.create('ORD-001', 'USER-001', amount, method)
	})

	describe('建立支付', () => {
		it('應該建立初始狀態的支付', () => {
			expect(payment.status.isInitiated()).toBe(true)
			expect(payment.orderId).toBe('ORD-001')
			expect(payment.userId).toBe('USER-001')
			expect(payment.amount.cents).toBe(50000)
		})

		it('應該發佈PaymentInitiated事件', () => {
			const events = payment.getUncommittedEvents()
			expect(events.length).toBe(1)
			expect(events[0] instanceof PaymentInitiated).toBe(true)
		})

		it('應該檢查初始狀態', () => {
			expect(payment.isPending()).toBe(true)
			expect(payment.isPaid()).toBe(false)
			expect(payment.isFailed()).toBe(false)
		})
	})

	describe('支付成功', () => {
		it('應該標記支付為成功', () => {
			const txId = new TransactionId('TXN-123')
			payment.succeed(txId)

			expect(payment.status.isSucceeded()).toBe(true)
			expect(payment.transactionId?.value).toBe('TXN-123')
			expect(payment.isPaid()).toBe(true)
		})

		it('應該發佈PaymentSucceeded事件', () => {
			const txId = new TransactionId('TXN-456')
			payment.succeed(txId)

			const events = payment.getUncommittedEvents()
			const succeededEvent = events.find(e => e instanceof PaymentSucceeded)
			expect(succeededEvent).toBeDefined()
			expect((succeededEvent as PaymentSucceeded).transactionId.value).toBe('TXN-456')
		})

		it('應該拒絕已成功的支付再標記為成功', () => {
			const txId1 = new TransactionId('TXN-001')
			payment.succeed(txId1)

			const txId2 = new TransactionId('TXN-002')
			expect(() => payment.succeed(txId2)).toThrow('無效的狀態轉換')
		})

		it('應該在成功時更新updatedAt', () => {
			const beforeTime = payment.updatedAt
			const beforeTimeMs = beforeTime.getTime()
			payment.succeed(new TransactionId('TXN-789'))
			const afterTimeMs = payment.updatedAt.getTime()
			expect(afterTimeMs >= beforeTimeMs).toBe(true)
		})
	})

	describe('支付失敗', () => {
		it('應該標記支付為失敗', () => {
			payment.fail('卡片被拒絕')

			expect(payment.status.isFailed()).toBe(true)
			expect(payment.failureReason).toBe('卡片被拒絕')
			expect(payment.isFailed()).toBe(true)
		})

		it('應該發佈PaymentFailed事件', () => {
			payment.fail('卡片被拒絕')

			const events = payment.getUncommittedEvents()
			const failedEvent = events.find(e => e instanceof PaymentFailed)
			expect(failedEvent).toBeDefined()
			expect((failedEvent as PaymentFailed).reason).toBe('卡片被拒絕')
		})

		it('應該拒絕已失敗的支付再標記為失敗', () => {
			payment.fail('卡片被拒絕')

			expect(() => payment.fail('另一個原因')).toThrow('無效的狀態轉換')
		})

		it('應該在失敗時更新updatedAt', () => {
			const beforeTime = payment.updatedAt
			const beforeTimeMs = beforeTime.getTime()
			payment.fail('超時')
			const afterTimeMs = payment.updatedAt.getTime()
			expect(afterTimeMs >= beforeTimeMs).toBe(true)
		})
	})

	describe('狀態機規則', () => {
		it('不應該允許成功後轉換到失敗', () => {
			payment.succeed(new TransactionId('TXN-001'))
			expect(() => payment.fail('失敗')).toThrow('無效的狀態轉換')
		})

		it('不應該允許失敗後轉換到成功', () => {
			payment.fail('失敗')
			expect(() => payment.succeed(new TransactionId('TXN-001'))).toThrow('無效的狀態轉換')
		})

		it('應該支持所有5種支付方式的支付', () => {
			const methods = [
				PaymentMethod.creditCard(),
				PaymentMethod.bankTransfer(),
				PaymentMethod.walletTransfer(),
				PaymentMethod.linePay(),
				PaymentMethod.applePay()
			]

			methods.forEach(method => {
				const p = Payment.create('ORD-002', 'USER-002', new Amount(10000), method)
				expect(p.paymentMethod.equals(method)).toBe(true)
				p.succeed(new TransactionId(`TXN-${method.type}`))
				expect(p.isPaid()).toBe(true)
			})
		})
	})

	describe('資料庫序列化', () => {
		it('應該從資料庫記錄恢復', () => {
			const dbRecord = {
				id: 'PAY-123',
				order_id: 'ORD-456',
				user_id: 'USER-789',
				amount_cents: 25000,
				payment_method: 'CREDIT_CARD',
				status: 'SUCCEEDED',
				transaction_id: 'TXN-ABC',
				failure_reason: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			const restored = Payment.fromDatabase(dbRecord)
			expect(restored.id.value).toBe('PAY-123')
			expect(restored.orderId).toBe('ORD-456')
			expect(restored.userId).toBe('USER-789')
			expect(restored.amount.cents).toBe(25000)
			expect(restored.status.isSucceeded()).toBe(true)
			expect(restored.transactionId?.value).toBe('TXN-ABC')
		})

		it('應該處理失敗的支付記錄', () => {
			const dbRecord = {
				id: 'PAY-999',
				order_id: 'ORD-999',
				user_id: 'USER-999',
				amount_cents: 10000,
				payment_method: 'BANK_TRANSFER',
				status: 'FAILED',
				transaction_id: null,
				failure_reason: '銀行帳戶無效',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			const restored = Payment.fromDatabase(dbRecord)
			expect(restored.status.isFailed()).toBe(true)
			expect(restored.failureReason).toBe('銀行帳戶無效')
			expect(restored.transactionId).toBeUndefined()
		})
	})

	describe('多支付方式支援', () => {
		it('應該支持信用卡支付流程', () => {
			const creditCardPayment = Payment.create(
				'ORD-CARD',
				'USER-CARD',
				new Amount(50000),
				PaymentMethod.creditCard()
			)
			expect(creditCardPayment.paymentMethod.type).toBe('CREDIT_CARD')
			creditCardPayment.succeed(new TransactionId('TXN-CARD-001'))
			expect(creditCardPayment.isPaid()).toBe(true)
		})

		it('應該支持銀行轉帳流程', () => {
			const bankPayment = Payment.create(
				'ORD-BANK',
				'USER-BANK',
				new Amount(100000),
				PaymentMethod.bankTransfer()
			)
			expect(bankPayment.paymentMethod.type).toBe('BANK_TRANSFER')
			bankPayment.succeed(new TransactionId('TXN-BANK-001'))
			expect(bankPayment.isPaid()).toBe(true)
		})

		it('應該支持LINE Pay流程', () => {
			const linePayment = Payment.create(
				'ORD-LINE',
				'USER-LINE',
				new Amount(75000),
				PaymentMethod.linePay()
			)
			expect(linePayment.paymentMethod.type).toBe('LINE_PAY')
			linePayment.fail('LINE Pay服務暫時中斷')
			expect(linePayment.isFailed()).toBe(true)
		})

		it('應該支持Apple Pay流程', () => {
			const applePayment = Payment.create(
				'ORD-APPLE',
				'USER-APPLE',
				new Amount(60000),
				PaymentMethod.applePay()
			)
			expect(applePayment.paymentMethod.type).toBe('APPLE_PAY')
			applePayment.succeed(new TransactionId('TXN-APPLE-001'))
			expect(applePayment.isPaid()).toBe(true)
		})
	})

	describe('邊界情況', () => {
		it('應該處理極高的金額', () => {
			const largeAmount = new Amount(999999999) // 9,999,999.99 元
			const p = Payment.create('ORD-LARGE', 'USER-LARGE', largeAmount, PaymentMethod.creditCard())
			expect(p.amount.cents).toBe(999999999)
		})

		it('應該處理最小金額', () => {
			const minAmount = new Amount(1) // 0.01 元
			const p = Payment.create('ORD-MIN', 'USER-MIN', minAmount, PaymentMethod.creditCard())
			expect(p.amount.cents).toBe(1)
			expect(p.amount.dollars).toBe(0.01)
		})

		it('應該在成功和失敗間正確切換狀態', () => {
			// Initiated → Succeeded
			payment.succeed(new TransactionId('TXN-001'))
			expect(payment.isPaid()).toBe(true)
			expect(payment.isFailed()).toBe(false)
			expect(payment.isPending()).toBe(false)
		})

		it('應該清空事件歷史', () => {
			payment.succeed(new TransactionId('TXN-123'))
			let events = payment.getUncommittedEvents()
			expect(events.length).toBeGreaterThan(0)

			payment.markEventsAsCommitted()
			events = payment.getUncommittedEvents()
			expect(events.length).toBe(0)
		})
	})
})
