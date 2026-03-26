/**
 * @file RefundRepository.test.ts
 * @description Integration Tests — InMemoryRefundRepository 驗證退款倉儲基本操作
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import { Refund } from '../../Domain/Entities/Refund'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'

// ──────────────────────────────────────────────────────────
// 簡化版記憶體倉儲（測試專用）
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
// 測試輔助
// ──────────────────────────────────────────────────────────

function makeRefund(params: {
	orderId?: string
	userId?: string
	type?: 'refund_only' | 'return_and_refund'
} = {}): Refund {
	return Refund.create({
		orderId: params.orderId ?? 'order-001',
		userId: params.userId ?? 'user-001',
		type: params.type === 'return_and_refund'
			? RefundType.returnAndRefund()
			: RefundType.refundOnly(),
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
}

/** 推進至 processing 狀態 */
function advanceToProcessing(refund: Refund): void {
	refund.submitForReview()
	refund.approve(PolicyDecision.auto('rule-test'))
	refund.startProcessing(Money.fromDollars(300, 'TWD'))
}

// ──────────────────────────────────────────────────────────
// 測試
// ──────────────────────────────────────────────────────────

describe('InMemoryRefundRepository — save + findById', () => {
	let repo: InMemoryRefundRepository

	beforeEach(() => {
		repo = new InMemoryRefundRepository()
	})

	it('save 後 findById 可取回相同退款', async () => {
		const refund = makeRefund()
		await repo.save(refund)

		const found = await repo.findById(refund.id)

		expect(found).not.toBeNull()
		expect(found!.id).toBe(refund.id)
		expect(found!.orderId).toBe('order-001')
		expect(found!.userId).toBe('user-001')
		expect(found!.status.value).toBe('requested')
	})

	it('save 後事件應被標記為已提交', async () => {
		const refund = makeRefund()
		expect(refund.getUncommittedEvents()).toHaveLength(1) // RefundRequested

		await repo.save(refund)

		expect(refund.getUncommittedEvents()).toHaveLength(0)
	})

	it('findById 找不到時回傳 null', async () => {
		const result = await repo.findById('nonexistent-id')
		expect(result).toBeNull()
	})

	it('儲存多個退款，count 正確', async () => {
		await repo.save(makeRefund({ orderId: 'order-001' }))
		await repo.save(makeRefund({ orderId: 'order-002' }))
		await repo.save(makeRefund({ orderId: 'order-003' }))

		const count = await repo.count()
		expect(count).toBe(3)
	})
})

describe('InMemoryRefundRepository — findByOrderId', () => {
	let repo: InMemoryRefundRepository

	beforeEach(() => {
		repo = new InMemoryRefundRepository()
	})

	it('根據 orderId 過濾，回傳正確退款清單', async () => {
		const r1 = makeRefund({ orderId: 'order-A', userId: 'user-001' })
		const r2 = makeRefund({ orderId: 'order-A', userId: 'user-002' })
		const r3 = makeRefund({ orderId: 'order-B', userId: 'user-001' })

		await repo.save(r1)
		await repo.save(r2)
		await repo.save(r3)

		const results = await repo.findByOrderId('order-A')

		expect(results).toHaveLength(2)
		const ids = results.map((r) => r.id)
		expect(ids).toContain(r1.id)
		expect(ids).toContain(r2.id)
		expect(ids).not.toContain(r3.id)
	})

	it('不存在的 orderId 回傳空陣列', async () => {
		await repo.save(makeRefund({ orderId: 'order-001' }))

		const results = await repo.findByOrderId('order-nonexistent')
		expect(results).toHaveLength(0)
	})
})

describe('InMemoryRefundRepository — findByUserId', () => {
	let repo: InMemoryRefundRepository

	beforeEach(() => {
		repo = new InMemoryRefundRepository()
	})

	it('根據 userId 過濾，回傳該使用者所有退款', async () => {
		const r1 = makeRefund({ orderId: 'order-001', userId: 'user-X' })
		const r2 = makeRefund({ orderId: 'order-002', userId: 'user-X' })
		const r3 = makeRefund({ orderId: 'order-003', userId: 'user-Y' })

		await repo.save(r1)
		await repo.save(r2)
		await repo.save(r3)

		const results = await repo.findByUserId('user-X')

		expect(results).toHaveLength(2)
		expect(results.every((r) => r.userId === 'user-X')).toBe(true)
	})

	it('不存在的 userId 回傳空陣列', async () => {
		await repo.save(makeRefund({ userId: 'user-001' }))

		const results = await repo.findByUserId('user-nobody')
		expect(results).toHaveLength(0)
	})
})

describe('InMemoryRefundRepository — findByStatus', () => {
	let repo: InMemoryRefundRepository

	beforeEach(() => {
		repo = new InMemoryRefundRepository()
	})

	it('根據 status 過濾，回傳對應狀態的退款', async () => {
		const r1 = makeRefund({ orderId: 'order-001' }) // requested
		const r2 = makeRefund({ orderId: 'order-002' }) // requested → processing
		const r3 = makeRefund({ orderId: 'order-003' }) // requested → processing → completed

		await repo.save(r1)

		advanceToProcessing(r2)
		await repo.save(r2)

		advanceToProcessing(r3)
		r3.markEventsAsCommitted()
		r3.complete()
		await repo.save(r3)

		const requested = await repo.findByStatus('requested')
		const processing = await repo.findByStatus('processing')
		const completed = await repo.findByStatus('completed')

		expect(requested).toHaveLength(1)
		expect(requested[0].id).toBe(r1.id)

		expect(processing).toHaveLength(1)
		expect(processing[0].id).toBe(r2.id)

		expect(completed).toHaveLength(1)
		expect(completed[0].id).toBe(r3.id)
	})

	it('不存在的 status 回傳空陣列', async () => {
		await repo.save(makeRefund())

		const results = await repo.findByStatus('completed')
		expect(results).toHaveLength(0)
	})
})
