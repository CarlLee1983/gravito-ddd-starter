/**
 * @file RefundSaga.test.ts
 * @description RefundSaga 整合測試 — 跨模組協調：Order 狀態 + Inventory 回補 + Payment 退款
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRefundSaga, type RefundSagaInput } from '../../Application/Sagas/RefundSaga'

const defaultInput: RefundSagaInput = {
	refundId: 'refund-1',
	orderId: 'order-1',
	paymentId: 'payment-1',
	refundAmountCents: 5000,
	currency: 'TWD',
	restoreInventory: true,
	inventoryItems: [{ productId: 'p1', quantity: 2 }],
}

describe('RefundSaga', () => {
	let orderService: {
		markRefunding: ReturnType<typeof vi.fn>
		restoreStatus: ReturnType<typeof vi.fn>
	}
	let inventoryPort: {
		restoreStock: ReturnType<typeof vi.fn>
		deductStock: ReturnType<typeof vi.fn>
	}
	let paymentService: {
		refund: ReturnType<typeof vi.fn>
	}

	beforeEach(() => {
		orderService = {
			markRefunding: vi.fn().mockResolvedValue(undefined),
			restoreStatus: vi.fn().mockResolvedValue(undefined),
		}
		inventoryPort = {
			restoreStock: vi.fn().mockResolvedValue(undefined),
			deductStock: vi.fn().mockResolvedValue(undefined),
		}
		paymentService = {
			refund: vi.fn().mockResolvedValue('gateway-refund-id-123'),
		}
	})

	it('所有步驟成功時，正確調用各服務', async () => {
		const saga = createRefundSaga(orderService, inventoryPort, paymentService)
		const context = await saga.execute(defaultInput)

		expect(context.error).toBeUndefined()

		// Order 狀態更新
		expect(orderService.markRefunding).toHaveBeenCalledTimes(1)
		expect(orderService.markRefunding).toHaveBeenCalledWith('order-1')

		// 庫存回補
		expect(inventoryPort.restoreStock).toHaveBeenCalledTimes(1)
		expect(inventoryPort.restoreStock).toHaveBeenCalledWith('p1', 2)

		// 退款處理
		expect(paymentService.refund).toHaveBeenCalledTimes(1)
		expect(paymentService.refund).toHaveBeenCalledWith('payment-1', 5000, 'TWD')
	})

	it('Payment 失敗時，補償 Order 狀態與 Inventory（deductStock 被調用）', async () => {
		paymentService.refund.mockRejectedValue(new Error('Payment gateway error'))

		const saga = createRefundSaga(orderService, inventoryPort, paymentService)
		const context = await saga.execute(defaultInput)

		expect(context.error).toBeDefined()
		expect(context.error?.message).toBe('Payment gateway error')

		// Order 補償
		expect(orderService.restoreStatus).toHaveBeenCalledTimes(1)
		expect(orderService.restoreStatus).toHaveBeenCalledWith('order-1')

		// Inventory 補償（deductStock）
		expect(inventoryPort.deductStock).toHaveBeenCalledTimes(1)
		expect(inventoryPort.deductStock).toHaveBeenCalledWith('p1', 2)

		// Payment 退款不能補償
		expect(paymentService.refund).toHaveBeenCalledTimes(1)
	})

	it('Inventory 失敗時，補償 Order 狀態；Payment 不被調用', async () => {
		inventoryPort.restoreStock.mockRejectedValue(new Error('Inventory service unavailable'))

		const saga = createRefundSaga(orderService, inventoryPort, paymentService)
		const context = await saga.execute(defaultInput)

		expect(context.error).toBeDefined()
		expect(context.error?.message).toBe('Inventory service unavailable')

		// Order 補償
		expect(orderService.restoreStatus).toHaveBeenCalledTimes(1)
		expect(orderService.restoreStatus).toHaveBeenCalledWith('order-1')

		// Payment 不應被調用（在 Inventory 步驟之後，但 Inventory 已失敗）
		expect(paymentService.refund).not.toHaveBeenCalled()

		// Inventory 補償不應被調用（自身失敗的步驟不在 executedSteps 中）
		expect(inventoryPort.deductStock).not.toHaveBeenCalled()
	})

	it('restoreInventory=false 時，Inventory.restoreStock 不被調用', async () => {
		const inputWithoutInventory: RefundSagaInput = {
			...defaultInput,
			restoreInventory: false,
		}

		const saga = createRefundSaga(orderService, inventoryPort, paymentService)
		const context = await saga.execute(inputWithoutInventory)

		expect(context.error).toBeUndefined()

		// Inventory 回補應跳過
		expect(inventoryPort.restoreStock).not.toHaveBeenCalled()

		// Order 和 Payment 仍應被調用
		expect(orderService.markRefunding).toHaveBeenCalledTimes(1)
		expect(paymentService.refund).toHaveBeenCalledTimes(1)
	})
})
