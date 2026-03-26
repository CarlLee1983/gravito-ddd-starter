/**
 * @file RefundEventHandlers.test.ts
 * @description Integration Tests — PaymentRefundHandler 事件處理器驗證
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import { PaymentRefundHandler } from '../../Infrastructure/EventHandlers/PaymentRefundHandler'
import { Refund } from '../../Domain/Entities/Refund'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

// ──────────────────────────────────────────────────────────
// 測試用 InMemoryRefundRepository
// ──────────────────────────────────────────────────────────

class InMemoryRefundRepository implements IRefundRepository {
	private store = new Map<string, Refund>()

	async save(refund: Refund): Promise<void> {
		this.store.set(refund.id, refund)
		refund.markEventsAsCommitted()
	}

	async findById(id: string): Promise<Refund | null> {
		return this.store.get(id) ?? null
	}

	async delete(id: string): Promise<void> {
		this.store.delete(id)
	}

	async findAll(): Promise<Refund[]> {
		return Array.from(this.store.values())
	}

	async count(): Promise<number> {
		return this.store.size
	}

	async findByOrderId(orderId: string): Promise<Refund[]> {
		return [...this.store.values()].filter((r) => r.orderId === orderId)
	}

	async findByUserId(userId: string): Promise<Refund[]> {
		return [...this.store.values()].filter((r) => r.userId === userId)
	}

	async findByStatus(status: string): Promise<Refund[]> {
		return [...this.store.values()].filter((r) => r.status.value === status)
	}
}

// ──────────────────────────────────────────────────────────
// 測試用 Mock Logger
// ──────────────────────────────────────────────────────────

const mockLogger: ILogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
}

// ──────────────────────────────────────────────────────────
// 測試輔助
// ──────────────────────────────────────────────────────────

/** 建立一個 processing 狀態的退款並儲存至 repo */
async function createProcessingRefund(
	repo: InMemoryRefundRepository,
	overrides: { orderId?: string; userId?: string } = {}
): Promise<Refund> {
	const refund = Refund.create({
		orderId: overrides.orderId ?? 'order-001',
		userId: overrides.userId ?? 'user-001',
		type: RefundType.refundOnly(),
		items: [
			{
				productId: 'product-001',
				productName: '測試商品',
				originalPrice: Money.fromDollars(300, 'TWD'),
				quantity: 1,
				reason: RefundReason.defective(),
			},
		],
	})

	// 推進至 processing
	refund.submitForReview()
	refund.approve(PolicyDecision.auto('rule-test'))
	const refundAmount = Money.fromDollars(300, 'TWD')
	refund.startProcessing(refundAmount)

	await repo.save(refund)

	return refund
}

// ──────────────────────────────────────────────────────────
// 測試
// ──────────────────────────────────────────────────────────

describe('PaymentRefundHandler — handlePaymentRefunded', () => {
	let repo: InMemoryRefundRepository
	let handler: PaymentRefundHandler

	beforeEach(() => {
		repo = new InMemoryRefundRepository()
		handler = new PaymentRefundHandler(repo, mockLogger)
	})

	it('PaymentRefunded 事件 → Refund 狀態變為 completed', async () => {
		const refund = await createProcessingRefund(repo)

		await handler.handlePaymentRefunded({ refundId: refund.id })

		const updated = await repo.findById(refund.id)
		expect(updated).not.toBeNull()
		expect(updated!.status.value).toBe('completed')
		expect(updated!.resolvedAt).not.toBeNull()
	})

	it('PaymentRefunded 含 data 包裝 → 正確解析 refundId', async () => {
		const refund = await createProcessingRefund(repo)

		// 某些事件系統會包裝 data 屬性
		await handler.handlePaymentRefunded({ data: { refundId: refund.id } })

		const updated = await repo.findById(refund.id)
		expect(updated!.status.value).toBe('completed')
	})

	it('PaymentRefunded — 未知 refundId，不拋出錯誤（優雅處理）', async () => {
		// 不應拋出錯誤
		await expect(
			handler.handlePaymentRefunded({ refundId: 'nonexistent-refund-id' })
		).resolves.toBeUndefined()
	})

	it('PaymentRefunded — 缺少 refundId，不拋出錯誤（優雅處理）', async () => {
		await expect(
			handler.handlePaymentRefunded({})
		).resolves.toBeUndefined()
	})
})

describe('PaymentRefundHandler — handlePaymentRefundFailed', () => {
	let repo: InMemoryRefundRepository
	let handler: PaymentRefundHandler

	beforeEach(() => {
		repo = new InMemoryRefundRepository()
		handler = new PaymentRefundHandler(repo, mockLogger)
	})

	it('PaymentRefundFailed 事件 → Refund 狀態變為 failed', async () => {
		const refund = await createProcessingRefund(repo)

		await handler.handlePaymentRefundFailed({
			refundId: refund.id,
			reason: '支付閘道逾時',
		})

		const updated = await repo.findById(refund.id)
		expect(updated).not.toBeNull()
		expect(updated!.status.value).toBe('failed')
	})

	it('PaymentRefundFailed 含 data 包裝 → 正確解析 refundId 和 reason', async () => {
		const refund = await createProcessingRefund(repo)

		await handler.handlePaymentRefundFailed({
			data: { refundId: refund.id, reason: '餘額不足' },
		})

		const updated = await repo.findById(refund.id)
		expect(updated!.status.value).toBe('failed')
	})

	it('PaymentRefundFailed — 未知 refundId，不拋出錯誤（優雅處理）', async () => {
		await expect(
			handler.handlePaymentRefundFailed({ refundId: 'nonexistent-refund-id', reason: '失敗' })
		).resolves.toBeUndefined()
	})

	it('PaymentRefundFailed — 缺少 refundId，不拋出錯誤（優雅處理）', async () => {
		await expect(
			handler.handlePaymentRefundFailed({ reason: '失敗' })
		).resolves.toBeUndefined()
	})
})
