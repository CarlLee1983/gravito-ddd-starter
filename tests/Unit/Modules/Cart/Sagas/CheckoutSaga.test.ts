/**
 * @file CheckoutSaga.test.ts
 * @description 結帳 Saga 端到端測試
 */

import { describe, expect, it } from 'bun:test'
import { createCheckoutSaga } from '@/Modules/Cart/Application/Sagas/CheckoutSaga'
import type { SagaContext } from '@/Foundation/Infrastructure/Sagas/ISaga'

describe('CheckoutSaga', () => {
	describe('完整結帳流程', () => {
		it('應該成功完成訂單和支付流程', async () => {
			// Mock 訂單服務
			const orderService = {
				createFromCart: async (params: any) => ({
					id: `order-${Date.now()}`,
					userId: params.userId,
					cartId: params.cartId,
					totalAmount: params.totalAmount,
					status: 'pending',
				}),
				cancel: async (orderId: string) => {
					// 補償：取消訂單
				},
			}

			// Mock 支付服務
			const paymentService = {
				initiate: async (params: any) => ({
					id: `payment-${Date.now()}`,
					orderId: params.orderId,
					amount: params.amount,
					status: 'initiated',
				}),
				cancel: async (paymentId: string) => {
					// 補償：取消支付
				},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			const context = await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 99.99,
				currency: 'TWD',
				paymentMethod: 'credit_card',
			})

			// 驗證成功執行
			expect(context.error).toBeUndefined()
			expect(context.results.has('CreateOrder')).toBe(true)
			expect(context.results.has('InitiatePayment')).toBe(true)

			// 驗證訂單結果
			const orderResult = context.results.get('CreateOrder') as any
			expect(orderResult.orderId).toBeDefined()
			expect(orderResult.order.totalAmount).toBe(99.99)

			// 驗證支付結果
			const paymentResult = context.results.get('InitiatePayment') as any
			expect(paymentResult.paymentId).toBeDefined()
			expect(paymentResult.payment.amount).toBe(99.99)

			// 驗證 correlationId
			expect(context.correlationId).toBeDefined()
		})

		it('應該在訂單建立失敗時回滾', async () => {
			const orderService = {
				createFromCart: async () => {
					throw new Error('訂單建立失敗')
				},
				cancel: async () => {
					// 不應該被呼叫
					throw new Error('不應該取消訂單')
				},
			}

			const paymentService = {
				initiate: async () => ({
					id: 'payment-1',
					status: 'initiated',
				}),
				cancel: async () => {
					// 不應該被呼叫
				},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			const context = await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 99.99,
			})

			// 驗證失敗
			expect(context.error).toBeDefined()
			expect(context.error?.message).toContain('訂單建立失敗')

			// 驗證沒有建立任何內容
			expect(context.results.has('CreateOrder')).toBe(false)
			expect(context.results.has('InitiatePayment')).toBe(false)
		})

		it('應該在支付失敗時補償訂單', async () => {
			const compensations: string[] = []

			const orderService = {
				createFromCart: async () => ({
					id: 'order-1',
					userId: 'user-123',
					status: 'pending',
				}),
				cancel: async (orderId: string) => {
					compensations.push(`cancel-order-${orderId}`)
				},
			}

			const paymentService = {
				initiate: async () => {
					throw new Error('支付服務不可用')
				},
				cancel: async () => {
					// 不會被呼叫（支付沒有成功建立）
				},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			const context = await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 99.99,
			})

			// 驗證失敗
			expect(context.error).toBeDefined()
			expect(context.error?.message).toContain('支付服務不可用')

			// 驗證補償被執行
			expect(compensations).toContain('cancel-order-order-1')
		})

		it('應該傳遞訂單 ID 到支付服務', async () => {
			let paymentOrderId: string | undefined

			const orderService = {
				createFromCart: async () => ({
					id: 'order-abc-123',
					userId: 'user-123',
					status: 'pending',
				}),
				cancel: async () => {},
			}

			const paymentService = {
				initiate: async (params: any) => {
					paymentOrderId = params.orderId
					return {
						id: 'payment-1',
						orderId: params.orderId,
						status: 'initiated',
					}
				},
				cancel: async () => {},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			const context = await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 99.99,
			})

			expect(context.error).toBeUndefined()
			expect(paymentOrderId).toBe('order-abc-123')
		})

		it('應該傳遞 correlationId 到所有服務', async () => {
			const capturedIds: string[] = []

			const orderService = {
				createFromCart: async (params: any) => {
					capturedIds.push(`order-correlationId:${params.correlationId}`)
					return { id: 'order-1', userId: params.userId }
				},
				cancel: async () => {},
			}

			const paymentService = {
				initiate: async (params: any) => {
					capturedIds.push(`payment-correlationId:${params.correlationId}`)
					return { id: 'payment-1', orderId: params.orderId }
				},
				cancel: async () => {},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			const specifiedId = 'checkout-saga-123'
			const context = await saga.execute(
				{
					userId: 'user-123',
					cartId: 'cart-456',
					totalAmount: 99.99,
				},
				specifiedId
			)

			expect(context.correlationId).toBe(specifiedId)
			expect(capturedIds).toContain(`order-correlationId:${specifiedId}`)
			expect(capturedIds).toContain(`payment-correlationId:${specifiedId}`)
		})

		it('應該支援多種支付方式', async () => {
			let capturedPaymentMethod: string | undefined

			const orderService = {
				createFromCart: async () => ({ id: 'order-1' }),
				cancel: async () => {},
			}

			const paymentService = {
				initiate: async (params: any) => {
					capturedPaymentMethod = params.paymentMethod
					return { id: 'payment-1', orderId: params.orderId }
				},
				cancel: async () => {},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 99.99,
				paymentMethod: 'apple_pay',
			})

			expect(capturedPaymentMethod).toBe('apple_pay')
		})

		it('應該使用預設支付方式當未指定', async () => {
			let capturedPaymentMethod: string | undefined
			let capturedCurrency: string | undefined

			const orderService = {
				createFromCart: async () => ({ id: 'order-1' }),
				cancel: async () => {},
			}

			const paymentService = {
				initiate: async (params: any) => {
					capturedPaymentMethod = params.paymentMethod
					capturedCurrency = params.currency
					return { id: 'payment-1', orderId: params.orderId }
				},
				cancel: async () => {},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 99.99,
			})

			expect(capturedPaymentMethod).toBe('credit_card') // 預設
			expect(capturedCurrency).toBe('TWD') // 預設
		})

		it('應該正確處理小數金額', async () => {
			let capturedAmount: number | undefined

			const orderService = {
				createFromCart: async (params: any) => ({
					id: 'order-1',
					totalAmount: params.totalAmount,
				}),
				cancel: async () => {},
			}

			const paymentService = {
				initiate: async (params: any) => {
					capturedAmount = params.amount
					return { id: 'payment-1', amount: params.amount }
				},
				cancel: async () => {},
			}

			const saga = createCheckoutSaga(orderService, paymentService)
			const context = await saga.execute({
				userId: 'user-123',
				cartId: 'cart-456',
				totalAmount: 123.45,
			})

			expect(context.error).toBeUndefined()
			expect(capturedAmount).toBe(123.45)
		})
	})
})
