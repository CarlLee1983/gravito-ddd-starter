/**
 * @file ReserveInventorySagaStep.test.ts
 * @description 預留庫存 Saga 步驟測試
 *
 * 測試場景：
 * 1. 成功預留：所有商品庫存都充足
 * 2. 部分商品不存在：第一個商品預留失敗
 * 3. 庫存不足：某個商品庫存不夠
 * 4. 補償流程：預留成功後，後續步驟失敗觸發補償
 * 5. 補償異常：釋放庫存時發生異常，不中斷補償
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReserveInventorySagaStep } from './ReserveInventorySagaStep'
import type { IInventoryCommandPort } from '@/Modules/Cart/Domain/Ports/IInventoryCommandPort'
import type { SagaContext } from '@/Foundation/Application/Sagas/ISaga'

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
		// Mock 實現可被測試覆蓋
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
		// Mock 實現可被測試覆蓋
	}
}

describe('ReserveInventorySagaStep', () => {
	let inventoryPort: MockInventoryCommandPort
	let cartItems: Array<{ productId: string; quantity: number }>
	let context: SagaContext
	let input: any

	beforeEach(() => {
		inventoryPort = new MockInventoryCommandPort()
		cartItems = [
			{ productId: 'prod-1', quantity: 5 },
			{ productId: 'prod-2', quantity: 3 },
		]
		context = {
			correlationId: 'test-saga-001',
			results: new Map(),
		}
		// 模擬 CreateOrder 步驟的結果
		context.results.set('CreateOrder', { orderId: 'order-001', order: {} })
		input = {
			userId: 'user-123',
			cartId: 'cart-001',
			totalAmount: 99.99,
		}
	})

	describe('execute()', () => {
		it('應該成功預留所有商品', async () => {
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			expect(result.reservations).toHaveLength(2)
			expect(result.totalReserved).toBe(8) // 5 + 3
			expect(result.reservations[0]).toMatchObject({
				productId: 'prod-1',
				quantity: 5,
				reservationId: 'res-prod-1',
			})
			expect(result.reservations[1]).toMatchObject({
				productId: 'prod-2',
				quantity: 3,
				reservationId: 'res-prod-2',
			})
		})

		it('應該在購物車為空時拋出異常', async () => {
			const step = new ReserveInventorySagaStep(inventoryPort, [])

			await expect(step.execute(input, context)).rejects.toThrow('購物車為空，無法預留庫存')
		})

		it('應該在訂單未建立時拋出異常', async () => {
			// 清空 CreateOrder 結果
			context.results.clear()
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)

			await expect(step.execute(input, context)).rejects.toThrow('訂單未建立，無法預留庫存')
		})

		it('應該在庫存不足時拋出異常', async () => {
			// Mock 庫存不足
			vi.spyOn(inventoryPort, 'reserve').mockRejectedValueOnce(
				new Error('庫存不足：需要 5，可用 2')
			)

			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)

			await expect(step.execute(input, context)).rejects.toThrow('庫存預留失敗')
		})

		it('應該在商品不存在時拋出異常', async () => {
			// Mock 商品不存在
			vi.spyOn(inventoryPort, 'reserve').mockRejectedValueOnce(
				new Error('商品不存在：productId=prod-999')
			)

			const step = new ReserveInventorySagaStep(inventoryPort, [
				...cartItems,
				{ productId: 'prod-999', quantity: 1 },
			])

			await expect(step.execute(input, context)).rejects.toThrow('庫存預留失敗')
		})

		it('應該在第一個商品預留失敗時停止', async () => {
			// 第一個成功，第二個失敗
			const reserveSpy = vi.spyOn(inventoryPort, 'reserve')
			reserveSpy
				.mockResolvedValueOnce({
					reservationId: 'res-prod-1',
					reserved: 5,
					available: 95,
				})
				.mockRejectedValueOnce(new Error('庫存不足'))

			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)

			await expect(step.execute(input, context)).rejects.toThrow('庫存預留失敗')

			// 驗證只調用了兩次（第一個成功，第二個失敗）
			expect(reserveSpy).toHaveBeenCalledTimes(2)
		})

		it('應該返回可用庫存資訊', async () => {
			// Mock 返回不同的可用庫存
			vi.spyOn(inventoryPort, 'reserve')
				.mockResolvedValueOnce({
					reservationId: 'res-prod-1',
					reserved: 5,
					available: 45, // 總庫存 50 - 已預留 5
				})
				.mockResolvedValueOnce({
					reservationId: 'res-prod-2',
					reserved: 3,
					available: 97, // 總庫存 100 - 已預留 3
				})

			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			expect(result.reservations[0].available).toBe(45)
			expect(result.reservations[1].available).toBe(97)
		})
	})

	describe('compensate()', () => {
		it('應該在無預留時不執行補償', async () => {
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const releaseSpy = vi.spyOn(inventoryPort, 'release')

			await step.compensate(context)

			expect(releaseSpy).not.toHaveBeenCalled()
		})

		it('應該釋放所有已預留的商品', async () => {
			// 先執行預留
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 存儲預留結果（模擬 Saga 存儲的結果）
			context.results.set('ReserveInventory', result)

			// 執行補償
			const releaseSpy = vi.spyOn(inventoryPort, 'release')
			await step.compensate(context)

			// 驗證釋放被調用了兩次（一次一個商品）
			expect(releaseSpy).toHaveBeenCalledTimes(2)

			// 驗證按倒序釋放（最後預留的先釋放）
			expect(releaseSpy).toHaveBeenNthCalledWith(
				1,
				'prod-2', // 第二個商品先釋放
				3,
				'order-001',
				'checkout_failed'
			)
			expect(releaseSpy).toHaveBeenNthCalledWith(
				2,
				'prod-1', // 第一個商品後釋放
				5,
				'order-001',
				'checkout_failed'
			)
		})

		it('應該在無訂單 ID 時跳過補償', async () => {
			// 清空 CreateOrder 結果
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 存儲預留結果
			context.results.set('ReserveInventory', result)

			// 清空訂單 ID
			context.results.delete('CreateOrder')

			// 執行補償
			const releaseSpy = vi.spyOn(inventoryPort, 'release')
			await step.compensate(context)

			// 驗證沒有調用釋放
			expect(releaseSpy).not.toHaveBeenCalled()
		})

		it('應該繼續補償其他商品即使某個商品釋放失敗', async () => {
			// 先執行預留
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 存儲預留結果
			context.results.set('ReserveInventory', result)

			// Mock 第一個釋放失敗，第二個成功
			const releaseSpy = vi.spyOn(inventoryPort, 'release')
			releaseSpy
				.mockRejectedValueOnce(new Error('系統異常'))
				.mockResolvedValueOnce()

			// 執行補償（不應拋出異常）
			await step.compensate(context)

			// 驗證兩次釋放都被調用
			expect(releaseSpy).toHaveBeenCalledTimes(2)
		})

		it('應該使用正確的補償原因', async () => {
			// 先執行預留
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 存儲預留結果
			context.results.set('ReserveInventory', result)

			// 執行補償
			const releaseSpy = vi.spyOn(inventoryPort, 'release')
			await step.compensate(context)

			// 驗證所有釋放都使用了 'checkout_failed' 原因
			releaseSpy.mock.calls.forEach((call) => {
				expect(call[3]).toBe('checkout_failed')
			})
		})

		it('應該在補償失敗時記錄警告但不拋出異常', async () => {
			// 先執行預留
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 存儲預留結果
			context.results.set('ReserveInventory', result)

			// Mock 釋放失敗
			vi.spyOn(inventoryPort, 'release').mockRejectedValueOnce(new Error('系統異常'))
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			// 執行補償（不應拋出異常）
			await step.compensate(context)

			// 驗證警告被記錄
			expect(warnSpy).toHaveBeenCalled()
			expect(warnSpy.mock.calls[0][0]).toContain('補償失敗')

			warnSpy.mockRestore()
		})
	})

	describe('step name', () => {
		it('應該有正確的步驟名稱', () => {
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			expect(step.name).toBe('ReserveInventory')
		})
	})

	describe('integration with Saga context', () => {
		it('應該在預留成功時存儲結果供補償使用', async () => {
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 模擬 Saga 存儲結果
			context.results.set('ReserveInventory', result)

			// 補償應該能存取這些結果
			expect(context.results.get('ReserveInventory')).toEqual(result)
			expect(context.results.get('ReserveInventory')?.reservations).toHaveLength(2)
		})

		it('應該能存取前置步驟的結果', async () => {
			const step = new ReserveInventorySagaStep(inventoryPort, cartItems)
			const result = await step.execute(input, context)

			// 驗證 execute 中能存取 CreateOrder 結果
			expect(context.results.get('CreateOrder')).toBeDefined()
			expect(result.reservations).toHaveLength(2)
		})
	})
})
