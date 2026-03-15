/**
 * @file PaymentAggregateRoot.test.ts
 * @description 測試 Payment AggregateRoot 的事件溯源機制
 */

import { describe, expect, it } from 'bun:test'
import { Payment } from '@/Modules/Payment/Domain/Aggregates/Payment'
import { PaymentStatus } from '@/Modules/Payment/Domain/ValueObjects/PaymentStatus'
import { Amount } from '@/Modules/Payment/Domain/ValueObjects/Amount'
import { PaymentMethod } from '@/Modules/Payment/Domain/ValueObjects/PaymentMethod'
import { TransactionId } from '@/Modules/Payment/Domain/ValueObjects/TransactionId'
import { PaymentInitiated } from '@/Modules/Payment/Domain/Events/PaymentInitiated'
import { PaymentSucceeded } from '@/Modules/Payment/Domain/Events/PaymentSucceeded'
import { PaymentFailed } from '@/Modules/Payment/Domain/Events/PaymentFailed'

describe('Payment AggregateRoot', () => {
	describe('建立新支付', () => {
		it('應該建立初始狀態為 initiated 的支付', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000), // 100.00 in cents
				PaymentMethod.from('credit_card')
			)

			expect(payment.id).toBeDefined()
			expect(payment.orderId).toBe('order-1')
			expect(payment.userId).toBe('user-1')
			expect(payment.amount.cents).toBe(10000)
			expect(payment.status.isInitiated()).toBe(true)
		})

		it('應該發出 PaymentInitiated 事件', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			const events = payment.getUncommittedEvents()
			expect(events).toHaveLength(1)
			expect(events[0]).toBeInstanceOf(PaymentInitiated)
		})
	})

	describe('支付成功', () => {
		it('應該更新狀態為 succeeded', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			payment.succeed(TransactionId.from('txn-123'))

			expect(payment.status.isSucceeded()).toBe(true)
			expect(payment.transactionId?.value).toBe('txn-123')
		})

		it('應該發出 PaymentSucceeded 事件', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			payment.markEventsAsCommitted()
			payment.succeed(TransactionId.from('txn-123'))

			const events = payment.getUncommittedEvents()
			expect(events).toHaveLength(1)
			expect(events[0]).toBeInstanceOf(PaymentSucceeded)
		})

		it('應該記錄成功時間', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			const beforeSucceed = new Date()
			payment.succeed(TransactionId.from('txn-123'))
			const afterSucceed = new Date()

			expect(payment.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSucceed.getTime())
			expect(payment.updatedAt.getTime()).toBeLessThanOrEqual(afterSucceed.getTime())
		})
	})

	describe('支付失敗', () => {
		it('應該更新狀態為 failed', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			payment.fail('insufficient_funds')

			expect(payment.status.isFailed()).toBe(true)
			expect(payment.failureReason).toBe('insufficient_funds')
		})

		it('應該發出 PaymentFailed 事件', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			payment.markEventsAsCommitted()
			payment.fail('card_declined')

			const events = payment.getUncommittedEvents()
			expect(events).toHaveLength(1)
			expect(events[0]).toBeInstanceOf(PaymentFailed)
		})

		it('應該記錄失敗原因', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			payment.fail('3d_secure_failed')

			expect(payment.failureReason).toBe('3d_secure_failed')
		})
	})

	describe('事件溯源', () => {
		it('應該從事件重建聚合根狀態', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			payment.succeed(TransactionId.from('txn-123'))

			// 驗證當前狀態
			expect(payment.status.isSucceeded()).toBe(true)
			expect(payment.transactionId?.value).toBe('txn-123')
		})

		it('應該支援多次事件應用', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			// 事件 1：已建立
			expect(payment.status.isInitiated()).toBe(true)

			// 事件 2：成功
			payment.markEventsAsCommitted()
			payment.succeed(TransactionId.from('txn-123'))
			expect(payment.status.isSucceeded()).toBe(true)

			// 驗證事件數量
			expect(payment.getUncommittedEvents()).toHaveLength(1)
		})
	})

	describe('狀態驗證', () => {
		it('支付物件應該追蹤所有未提交的事件', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			let events = payment.getUncommittedEvents()
			expect(events).toHaveLength(1) // PaymentInitiated

			payment.markEventsAsCommitted()
			events = payment.getUncommittedEvents()
			expect(events).toHaveLength(0) // 已清除

			payment.succeed(TransactionId.from('txn-123'))
			events = payment.getUncommittedEvents()
			expect(events).toHaveLength(1) // PaymentSucceeded
		})
	})

	describe('支付詳細資訊', () => {
		it('應該正確存儲訂單和用戶信息', () => {
			const payment = Payment.create(
				'order-abc-123',
				'user-xyz-789',
				new Amount(25050), // 250.50
				PaymentMethod.from('apple_pay')
			)

			expect(payment.orderId).toBe('order-abc-123')
			expect(payment.userId).toBe('user-xyz-789')
			expect(payment.amount.cents).toBe(25050)
		})

		it('應該正確存儲支付方式', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('apple_pay')
			)

			expect(payment.paymentMethod.type).toBe('APPLE_PAY')
		})

		it('成功的支付應該有交易 ID', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			expect(payment.transactionId).toBeUndefined()

			payment.succeed(TransactionId.from('txn-unique-id-12345'))
			expect(payment.transactionId?.value).toBe('txn-unique-id-12345')
		})

		it('失敗的支付應該有失敗原因', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000),
				PaymentMethod.from('credit_card')
			)

			expect(payment.failureReason).toBeUndefined()

			payment.fail('network_error')
			expect(payment.failureReason).toBe('network_error')
		})

		it('應該支援多種支付方式', () => {
			const methods = ['credit_card', 'bank_transfer', 'apple_pay', 'line_pay', 'wallet_transfer']

			for (const method of methods) {
				const payment = Payment.create(
					'order-1',
					'user-1',
					new Amount(10000),
					PaymentMethod.from(method)
				)

				expect(payment.paymentMethod.type).toBe(method.toUpperCase())
			}
		})
	})

	describe('金額處理', () => {
		it('應該支援小數金額', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(123456), // 1234.56
				PaymentMethod.from('credit_card')
			)

			expect(payment.amount.cents).toBe(123456)
		})

		it('應該支援整數金額', () => {
			const payment = Payment.create(
				'order-1',
				'user-1',
				new Amount(10000), // 100.00
				PaymentMethod.from('credit_card')
			)

			expect(payment.amount.cents).toBe(10000)
		})
	})
})
