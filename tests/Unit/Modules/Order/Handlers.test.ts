/**
 * @file Handlers.test.ts
 * @description Order 模組事件處理器單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { CartCheckoutRequestedHandler } from '@/Modules/Order/Application/Handlers/CartCheckoutRequestedHandler'
import { PaymentSucceededHandler } from '@/Modules/Order/Application/Handlers/PaymentSucceededHandler'
import { PlaceOrderService } from '@/Modules/Order/Application/Services/PlaceOrderService'
import type { IOrderRepository } from '@/Modules/Order/Domain/Repositories/IOrderRepository'

describe('Order Handlers', () => {
	describe('CartCheckoutRequestedHandler', () => {
		it('應該在接收 CartCheckoutRequested 事件時呼叫 PlaceOrderService', async () => {
			// Arrange
			let serviceExecuteCalled = false
			let executedData: any = null

			const mockPlaceOrderService = {
				execute: async (data: any) => {
					serviceExecuteCalled = true
					executedData = data
				},
			} as unknown as PlaceOrderService

			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new CartCheckoutRequestedHandler(mockPlaceOrderService, mockLogger)

			const event = {
				userId: 'user-123',
				items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
				totalAmount: 200,
				taxAmount: 0,
			}

			// Act
			await handler.handle(event)

			// Assert
			expect(serviceExecuteCalled).toBe(true)
			expect(executedData).toBeDefined()
			expect(executedData.userId).toBe('user-123')
			expect(executedData.lines).toEqual(event.items)
		})
	})

	describe('PaymentSucceededHandler', () => {
		it('應該在接收 PaymentSucceeded 事件時確認訂單', async () => {
			// Arrange
			let confirmCalled = false
			let updateCalled = false
			const orderId = 'order-123'

			const mockOrder = {
				id: { value: orderId },
				confirm: () => {
					confirmCalled = true
				},
			}

			const mockOrderRepository = {
				findById: async (id: string) => {
					return id === orderId ? mockOrder : null
				},
				update: async (order: any) => {
					if (order === mockOrder) {
						updateCalled = true
					}
				},
			} as unknown as IOrderRepository

			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new PaymentSucceededHandler(mockOrderRepository, mockLogger)

			const event = {
				orderId,
			}

			// Act
			await handler.handle(event)

			// Assert
			expect(confirmCalled).toBe(true)
			expect(updateCalled).toBe(true)
		})

		it('應該處理缺少 orderId 的事件', async () => {
			// Arrange
			const mockOrderRepository = {} as unknown as IOrderRepository
			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new PaymentSucceededHandler(mockOrderRepository, mockLogger)
			const event = {}

			// Act & Assert - 應該不拋出異常
			await expect(handler.handle(event)).resolves.toBeUndefined()
		})

		it('應該處理訂單不存在的情況', async () => {
			// Arrange
			const mockOrderRepository = {
				findById: async (id: string) => null,
			} as unknown as IOrderRepository

			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new PaymentSucceededHandler(mockOrderRepository, mockLogger)
			const event = { orderId: 'non-existent' }

			// Act & Assert - 應該不拋出異常
			await expect(handler.handle(event)).resolves.toBeUndefined()
		})
	})
})
