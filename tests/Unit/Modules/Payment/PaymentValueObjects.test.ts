import { describe, it, expect } from 'bun:test'
import { PaymentId } from '@/Modules/Payment/Domain/ValueObjects/PaymentId'
import { TransactionId } from '@/Modules/Payment/Domain/ValueObjects/TransactionId'
import { Amount } from '@/Modules/Payment/Domain/ValueObjects/Amount'
import { PaymentMethod } from '@/Modules/Payment/Domain/ValueObjects/PaymentMethod'
import { PaymentStatus } from '@/Modules/Payment/Domain/ValueObjects/PaymentStatus'
import type { IPaymentRepository } from '@/Modules/Payment/Domain/Repositories/IPaymentRepository'

describe('Payment ValueObjects', () => {
	describe('PaymentId', () => {
		it('應該自動生成唯一ID', () => {
			const id1 = new PaymentId()
			const id2 = new PaymentId()
			expect(id1.value).not.toBe(id2.value)
		})

		it('應該從字符串建立', () => {
			const id = PaymentId.from('test-123')
			expect(id.value).toBe('test-123')
		})

		it('應該比較相等', () => {
			const id1 = PaymentId.from('id-1')
			const id2 = PaymentId.from('id-1')
			expect(id1.equals(id2)).toBe(true)
		})

		it('應該轉換為字符串', () => {
			const id = PaymentId.from('abc')
			expect(id.toString()).toBe('abc')
		})
	})

	describe('TransactionId', () => {
		it('應該建立有效的交易ID', () => {
			const txId = new TransactionId('TXN-001')
			expect(txId.value).toBe('TXN-001')
		})

		it('應該拒絕空交易ID', () => {
			expect(() => new TransactionId('')).toThrow('交易編號不能為空')
		})

		it('應該拒絕空白交易ID', () => {
			expect(() => new TransactionId('   ')).toThrow('交易編號不能為空')
		})

		it('應該比較相等', () => {
			const tx1 = new TransactionId('TXN-001')
			const tx2 = new TransactionId('TXN-001')
			expect(tx1.equals(tx2)).toBe(true)
		})
	})

	describe('Amount', () => {
		it('應該以分為單位建立金額', () => {
			const amount = new Amount(10050) // 100.50 元
			expect(amount.cents).toBe(10050)
			expect(amount.dollars).toBe(100.5)
		})

		it('應該從元轉換為分', () => {
			const amount = Amount.fromTWD(99.99)
			expect(amount.cents).toBe(9999)
		})

		it('應該拒絕非正整數', () => {
			expect(() => new Amount(0)).toThrow('金額必須為正整數')
			expect(() => new Amount(-100)).toThrow('金額必須為正整數')
		})

		it('應該拒絕浮點數', () => {
			expect(() => new Amount(100.5)).toThrow('金額必須為正整數')
		})

		it('應該進行金額運算', () => {
			const a1 = new Amount(5000) // 50 元
			const a2 = new Amount(3000) // 30 元

			const sum = a1.plus(a2)
			expect(sum.cents).toBe(8000)

			const diff = a1.minus(a2)
			expect(diff.cents).toBe(2000)
		})

		it('應該比較大小', () => {
			const a1 = new Amount(5000)
			const a2 = new Amount(3000)

			expect(a1.isGreaterThan(a2)).toBe(true)
			expect(a1.isLessThan(a2)).toBe(false)
		})

		it('應該相等比較', () => {
			const a1 = new Amount(5000)
			const a2 = new Amount(5000)
			expect(a1.equals(a2)).toBe(true)
		})

		it('應該格式化為字符串', () => {
			const amount = new Amount(10050)
			expect(amount.toString()).toBe('NT$100.50')
		})
	})

	describe('PaymentMethod', () => {
		it('應該支持所有5種支付方式', () => {
			const methods = [
				PaymentMethod.creditCard(),
				PaymentMethod.bankTransfer(),
				PaymentMethod.walletTransfer(),
				PaymentMethod.linePay(),
				PaymentMethod.applePay()
			]
			expect(methods.length).toBe(5)
		})

		it('應該從字符串建立支付方式', () => {
			const method = PaymentMethod.from('CREDIT_CARD')
			expect(method.type).toBe('CREDIT_CARD')
		})

		it('應該不區分大小寫', () => {
			const m1 = PaymentMethod.from('credit_card')
			const m2 = PaymentMethod.from('CREDIT_CARD')
			expect(m1.equals(m2)).toBe(true)
		})

		it('應該拒絕無效的支付方式', () => {
			expect(() => PaymentMethod.from('INVALID')).toThrow('無效的支付方式')
		})

		it('應該轉換為中文標籤', () => {
			expect(PaymentMethod.creditCard().toString()).toBe('信用卡')
			expect(PaymentMethod.bankTransfer().toString()).toBe('銀行轉帳')
			expect(PaymentMethod.walletTransfer().toString()).toBe('電子錢包')
			expect(PaymentMethod.linePay().toString()).toBe('LINE Pay')
			expect(PaymentMethod.applePay().toString()).toBe('Apple Pay')
		})

		it('應該進行相等比較', () => {
			const m1 = PaymentMethod.creditCard()
			const m2 = PaymentMethod.creditCard()
			expect(m1.equals(m2)).toBe(true)
		})
	})

	describe('PaymentStatus', () => {
		it('應該建立初始狀態', () => {
			const status = PaymentStatus.initiated()
			expect(status.isInitiated()).toBe(true)
			expect(status.value).toBe('INITIATED')
		})

		it('應該建立成功狀態', () => {
			const status = PaymentStatus.succeeded()
			expect(status.isSucceeded()).toBe(true)
		})

		it('應該建立失敗狀態', () => {
			const status = PaymentStatus.failed()
			expect(status.isFailed()).toBe(true)
		})

		it('應該從字符串建立狀態', () => {
			const s1 = PaymentStatus.from('INITIATED')
			const s2 = PaymentStatus.from('SUCCEEDED')
			const s3 = PaymentStatus.from('FAILED')

			expect(s1.isInitiated()).toBe(true)
			expect(s2.isSucceeded()).toBe(true)
			expect(s3.isFailed()).toBe(true)
		})

		it('應該驗證狀態轉換', () => {
			const initiated = PaymentStatus.initiated()
			const succeeded = PaymentStatus.succeeded()
			const failed = PaymentStatus.failed()

			// Initiated 可轉換到 Succeeded
			expect(initiated.canTransitionTo(succeeded)).toBe(true)

			// Initiated 可轉換到 Failed
			expect(initiated.canTransitionTo(failed)).toBe(true)

			// Succeeded 不可轉換
			expect(succeeded.canTransitionTo(failed)).toBe(false)
			expect(succeeded.canTransitionTo(initiated)).toBe(false)

			// Failed 不可轉換
			expect(failed.canTransitionTo(succeeded)).toBe(false)
		})

		it('應該轉換為中文標籤', () => {
			expect(PaymentStatus.initiated().toString()).toBe('待支付')
			expect(PaymentStatus.succeeded().toString()).toBe('已支付')
			expect(PaymentStatus.failed().toString()).toBe('支付失敗')
		})
	})
})
