/**
 * @file CheckoutSaga.test.ts
 * @description 結帳 Saga 測試（3 步驟）
 *
 * 測試場景：
 * 1. 成功結帳：所有 3 步驟都成功
 * 2. 訂單建立失敗：第一步失敗，無補償
 * 3. 支付失敗：第二步失敗，補償取消訂單
 * 4. 庫存預留失敗：第三步失敗，補償取消支付和訂單
 * 5. 多商品預留：驗證購物車中的多個商品都被預留
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCheckoutSaga } from './CheckoutSaga'
import type { IInventoryCommandPort } from '@/Modules/Cart/Domain/Ports/IInventoryCommandPort'

/**
 * Mock 訂單服務
 */
class MockOrderService {
	async createFromCart(request: any): Promise<{ id: string }> {
		return { id: 'order-001' }
	}

	async cancel(orderId: string): Promise<void> {
		// Mock 實現
	}
}

/**
 * Mock 支付服務
 */
class MockPaymentService {
	async initiate(request: any): Promise<{ id: string }> {
		return { id: 'payment-001' }
	}

	async cancel(paymentId: string): Promise<void> {
		// Mock 實現
	}
}

/**
 * Mock IInventoryCommandPort
 */
class MockInventoryCommandPort implements IInventoryCommandPort {
	async checkAvailability(
		productId: string,
		requiredQuantity: number
	): Promise<{ available: boolean; currentStock: number }> {
		return { available: true, currentStock: 100 }
	}

	async reserve(
		productId: string,
		quantity: number,
		orderId: string
	): Promise<{ reservationId: string; reserved: number; available: number }> {
		return {
			reservationId: `res-${productId}`,
			reserved: quantity,
			available: 100 - quantity,
		}
	}

	async deduct(
		productId: string,
		quantity: number,
		orderId: string
	): Promise<{ inventoryId: string; remainingStock: number }> {
		return {
			inventoryId: `inv-${productId}`,
			remainingStock: 100 - quantity,
		}
	}

	async release(
		productId: string,
		quantity: number,
		orderId: string,
		reason?: string
	): Promise<void> {
		// Mock 實現
	}
}

describe('CheckoutSaga (3 Steps)', () => {
	let orderService: MockOrderService
	let paymentService: MockPaymentService
	let inventoryPort: MockInventoryCommandPort
	let cartItems: Array<{ productId: string; quantity: number }>
	let input: any

	beforeEach(() => {
		orderService = new MockOrderService()
		paymentService = new MockPaymentService()
		inventoryPort = new MockInventoryCommandPort()
		cartItems = [
			{ productId: 'prod-1', quantity: 5 },
			{ productId: 'prod-2', quantity: 3 },
		]
		input = {
			userId: 'user-123',
			cartId: 'cart-001',
			totalAmount: 99.99,
			currency: 'TWD',
			paymentMethod: 'credit_card',
		}
	})

	describe('success flow', () => {
		it('應該完成 3 步驟結帳（訂單→支付→庫存）', async () => {
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input, 'test-saga-001')

			// 驗證成功
			expect(context.error).toBeUndefined()
			expect(context.results.size).toBe(3)

			// 驗證每個步驟的結果
			const createOrderResult = context.results.get('CreateOrder') as any
			expect(createOrderResult?.orderId).toBe('order-001')

			const initiatePaymentResult = context.results.get('InitiatePayment') as any
			expect(initiatePaymentResult?.paymentId).toBe('payment-001')

			const reserveInventoryResult = context.results.get('ReserveInventory') as any
			expect(reserveInventoryResult?.reservations).toHaveLength(2)
			expect(reserveInventoryResult?.totalReserved).toBe(8)
		})

		it('應該使用提供的 correlationId', async () => {
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input, 'custom-saga-id')

			expect(context.correlationId).toBe('custom-saga-id')
		})

		it('應該自動生成 correlationId 如果未提供', async () => {
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證 correlationId 是有效的 UUID 格式
			expect(context.correlationId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		})

		it('應該預留多個商品', async () => {
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證 reserve 被調用了兩次（一次一個商品）
			expect(reserveSpy).toHaveBeenCalledTimes(2)
			expect(reserveSpy).toHaveBeenNthCalledWith(1, 'prod-1', 5, 'order-001')
			expect(reserveSpy).toHaveBeenNthCalledWith(2, 'prod-2', 3, 'order-001')
		})
	})

	describe('step 1 failure - CreateOrder', () => {
		it('應該在訂單建立失敗時停止並返回錯誤', async () => {
			// Mock 訂單建立失敗
			const createSpy = vi.spyOn(orderService, 'createFromCart')
			createSpy.mockRejectedValueOnce(new Error('創建訂單失敗'))

			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證失敗
			expect(context.error).toBeDefined()
			expect(context.error?.message).toContain('創建訂單失敗')

			// 驗證只有第一步被執行
			expect(context.results.get('CreateOrder')).toBeUndefined()
			expect(context.results.get('InitiatePayment')).toBeUndefined()
			expect(context.results.get('ReserveInventory')).toBeUndefined()
		})

		it('應該在訂單建立失敗時不執行補償', async () => {
			// Mock 訂單建立失敗
			const createSpy = vi.spyOn(orderService, 'createFromCart')
			createSpy.mockRejectedValueOnce(new Error('創建訂單失敗'))

			const cancelSpy = vi.spyOn(orderService, 'cancel')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			await saga.execute(input)

			// 驗證沒有補償被執行
			expect(cancelSpy).not.toHaveBeenCalled()
		})
	})

	describe('step 2 failure - InitiatePayment', () => {
		it('應該在支付發起失敗時補償訂單', async () => {
			// Mock 支付發起失敗
			const initiateSpy = vi.spyOn(paymentService, 'initiate')
			initiateSpy.mockRejectedValueOnce(new Error('支付閘道故障'))

			const cancelOrderSpy = vi.spyOn(orderService, 'cancel')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證失敗
			expect(context.error).toBeDefined()
			expect(context.error?.message).toContain('支付閘道故障')

			// 驗證補償：訂單被取消
			expect(cancelOrderSpy).toHaveBeenCalledWith('order-001')

			// 驗證第三步沒有執行
			expect(context.results.get('ReserveInventory')).toBeUndefined()
		})

		it('應該在支付失敗後不預留庫存', async () => {
			// Mock 支付發起失敗
			vi.spyOn(paymentService, 'initiate').mockRejectedValueOnce(
				new Error('支付失敗')
			)

			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			await saga.execute(input)

			// 驗證 reserve 沒有被調用
			expect(reserveSpy).not.toHaveBeenCalled()
		})
	})

	describe('step 3 failure - ReserveInventory', () => {
		it('應該在庫存預留失敗時進行完整補償', async () => {
			// Mock 第二個商品的預留失敗
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			reserveSpy
				.mockResolvedValueOnce({
					reservationId: 'res-prod-1',
					reserved: 5,
					available: 95,
				})
				.mockRejectedValueOnce(new Error('庫存不足'))

			const cancelPaymentSpy = vi.spyOn(paymentService, 'cancel')
			const cancelOrderSpy = vi.spyOn(orderService, 'cancel')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證失敗
			expect(context.error).toBeDefined()
			expect(context.error?.message).toContain('庫存預留失敗')

			// 驗證補償：支付和訂單都被取消
			expect(cancelPaymentSpy).toHaveBeenCalledWith('payment-001')
			expect(cancelOrderSpy).toHaveBeenCalledWith('order-001')
		})

		it('應該在庫存預留失敗時進行完整補償', async () => {
			// 讓第三步完全失敗，導致支付和訂單補償
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			reserveSpy
				.mockResolvedValueOnce({
					reservationId: 'res-prod-1',
					reserved: 5,
					available: 95,
				})
				.mockRejectedValueOnce(new Error('庫存不足'))

			const cancelPaymentSpy = vi.spyOn(paymentService, 'cancel')
			const cancelOrderSpy = vi.spyOn(orderService, 'cancel')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證失敗並補償支付和訂單
			expect(context.error).toBeDefined()
			expect(cancelPaymentSpy).toHaveBeenCalledWith('payment-001')
			expect(cancelOrderSpy).toHaveBeenCalledWith('order-001')
		})

		it('應該在商品不存在時補償', async () => {
			// Mock 商品不存在
			vi.spyOn(inventoryPort, 'reserve').mockRejectedValueOnce(
				new Error('商品不存在：productId=prod-1')
			)

			const cancelPaymentSpy = vi.spyOn(paymentService, 'cancel')
			const cancelOrderSpy = vi.spyOn(orderService, 'cancel')
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證失敗並補償
			expect(context.error).toBeDefined()
			expect(cancelPaymentSpy).toHaveBeenCalledWith('payment-001')
			expect(cancelOrderSpy).toHaveBeenCalledWith('order-001')
		})
	})

	describe('single product checkout', () => {
		it('應該支持單個商品結帳', async () => {
			const singleItem = [{ productId: 'prod-1', quantity: 5 }]
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, singleItem)
			const context = await saga.execute(input)

			// 驗證成功
			expect(context.error).toBeUndefined()
			const reserveResult = context.results.get('ReserveInventory') as any
			expect(reserveResult?.reservations).toHaveLength(1)
			expect(reserveResult?.totalReserved).toBe(5)
		})
	})

	describe('large order', () => {
		it('應該支持大型訂單（多個商品）', async () => {
			const largeCartItems = Array.from({ length: 10 }, (_, i) => ({
				productId: `prod-${i + 1}`,
				quantity: i + 1,
			}))

			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, largeCartItems)
			const context = await saga.execute(input)

			// 驗證成功
			expect(context.error).toBeUndefined()
			const reserveResult = context.results.get('ReserveInventory') as any
			expect(reserveResult?.reservations).toHaveLength(10)
			// 總數：1+2+3+...+10 = 55
			expect(reserveResult?.totalReserved).toBe(55)
		})
	})

	describe('saga state and ordering', () => {
		it('應該按順序執行步驟（CreateOrder→InitiatePayment→ReserveInventory）', async () => {
			const createOrderSpy = vi.spyOn(orderService, 'createFromCart')
			const initiateSpy = vi.spyOn(paymentService, 'initiate')
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')

			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			await saga.execute(input)

			// 驗證調用順序
			const createOrderOrder = createOrderSpy.mock.invocationCallOrder[0]
			const initiateOrder = initiateSpy.mock.invocationCallOrder[0]
			const reserveOrder = reserveSpy.mock.invocationCallOrder[0]

			expect(createOrderOrder).toBeLessThan(initiateOrder)
			expect(initiateOrder).toBeLessThan(reserveOrder)
		})

		it('應該在結果中存儲所有步驟的輸出', async () => {
			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			const context = await saga.execute(input)

			// 驗證所有三個步驟的結果都被存儲
			expect(context.results.has('CreateOrder')).toBe(true)
			expect(context.results.has('InitiatePayment')).toBe(true)
			expect(context.results.has('ReserveInventory')).toBe(true)
		})
	})

	describe('compensation logic', () => {
		it('應該按倒序執行補償（ReserveInventory→InitiatePayment→CreateOrder）', async () => {
			// 讓第三步失敗以觸發補償
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			reserveSpy.mockRejectedValueOnce(new Error('庫存不足'))

			const cancelOrderSpy = vi.spyOn(orderService, 'cancel')
			const cancelPaymentSpy = vi.spyOn(paymentService, 'cancel')

			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			await saga.execute(input)

			// 驗證補償順序：支付先補償，然後訂單
			const cancelPaymentOrder = cancelPaymentSpy.mock.invocationCallOrder[0]
			const cancelOrderOrder = cancelOrderSpy.mock.invocationCallOrder[0]

			expect(cancelPaymentOrder).toBeLessThan(cancelOrderOrder)
		})

		it('應該在補償失敗時繼續其他補償', async () => {
			// Mock 支付補償失敗
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			reserveSpy.mockRejectedValueOnce(new Error('庫存不足'))

			const cancelPaymentSpy = vi.spyOn(paymentService, 'cancel')
			cancelPaymentSpy.mockRejectedValueOnce(new Error('支付系統故障'))

			const cancelOrderSpy = vi.spyOn(orderService, 'cancel')

			const saga = createCheckoutSaga(orderService, paymentService, inventoryPort, cartItems)
			await saga.execute(input)

			// 驗證訂單補償仍被執行，即使支付補償失敗
			expect(cancelOrderSpy).toHaveBeenCalledWith('order-001')
		})
	})
})
