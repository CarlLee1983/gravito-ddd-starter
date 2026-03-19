/**
 * @file Handlers.test.ts
 * @description Payment 模組事件處理器單元測試
 */

import { describe, it, expect } from 'bun:test'
import { OrderPlacedHandler } from '@/Modules/Payment/Application/Handlers/OrderPlacedHandler'
import { InitiatePaymentService } from '@/Modules/Payment/Application/Services/InitiatePaymentService'

describe('Payment Handlers', () => {
	describe('OrderPlacedHandler', () => {
		it('應該在接收 OrderPlaced 事件時呼叫 InitiatePaymentService', async () => {
			// Arrange
			let serviceExecuteCalled = false
			let executedData: any = null

			const mockInitiatePaymentService = {
				execute: async (data: any) => {
					serviceExecuteCalled = true
					executedData = data
				},
			} as unknown as InitiatePaymentService

			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new OrderPlacedHandler(mockInitiatePaymentService, mockLogger)

			const event = {
				orderId: 'order-123',
				userId: 'user-456',
				total: 50000,
				currency: 'TWD',
			}

			// Act
			await handler.handle(event)

			// Assert
			expect(serviceExecuteCalled).toBe(true)
			expect(executedData).toBeDefined()
			expect(executedData.orderId).toBe('order-123')
			expect(executedData.userId).toBe('user-456')
			expect(executedData.amount).toBe(50000)
			expect(executedData.currency).toBe('TWD')
		})

		it('應該支援嵌套資料結構 event.data.orderId', async () => {
			// Arrange
			let serviceExecuteCalled = false
			let executedData: any = null

			const mockInitiatePaymentService = {
				execute: async (data: any) => {
					serviceExecuteCalled = true
					executedData = data
				},
			} as unknown as InitiatePaymentService

			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new OrderPlacedHandler(mockInitiatePaymentService, mockLogger)

			const event = {
				data: {
					orderId: 'order-nested',
					userId: 'user-nested',
					total: 100000,
					currency: 'USD',
				},
			}

			// Act
			await handler.handle(event)

			// Assert
			expect(serviceExecuteCalled).toBe(true)
			expect(executedData.orderId).toBe('order-nested')
			expect(executedData.userId).toBe('user-nested')
			expect(executedData.amount).toBe(100000)
			expect(executedData.currency).toBe('USD')
		})

		it('應該處理缺少 orderId 或 userId 的事件', async () => {
			// Arrange
			const mockInitiatePaymentService = {} as unknown as InitiatePaymentService
			const mockLogger = {
				info: () => {},
				error: () => {},
				warn: () => {},
				debug: () => {},
			}

			const handler = new OrderPlacedHandler(mockInitiatePaymentService, mockLogger)
			const event = { total: 5000 } // 缺少 orderId 和 userId

			// Act & Assert - 應該不拋出異常，但也不應該呼叫服務
			await expect(handler.handle(event)).resolves.toBeUndefined()
		})
	})
})
