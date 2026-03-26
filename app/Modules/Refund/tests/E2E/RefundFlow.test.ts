/**
 * @file RefundFlow.test.ts
 * @description E2E Tests — 透過 RefundApplicationService 驗證完整退款流程
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import type { IOrderQueryPort } from '../../Domain/Ports/IOrderQueryPort'
import type { IRefundHistoryPort } from '../../Domain/Ports/IRefundHistoryPort'
import { RefundApplicationService } from '../../Application/Services/RefundApplicationService'
import { PaymentRefundHandler } from '../../Infrastructure/EventHandlers/PaymentRefundHandler'
import { Refund } from '../../Domain/Entities/Refund'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'
import { OrderContext } from '../../Domain/ValueObjects/OrderContext'
import { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import { RefundFees } from '../../Domain/ValueObjects/RefundFees'
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
// Mock Logger
// ──────────────────────────────────────────────────────────

const mockLogger: ILogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
}

// ──────────────────────────────────────────────────────────
// 測試輔助：標準 OrderContext Mock
// ──────────────────────────────────────────────────────────

/**
 * 建立標準測試用 OrderContext（3 天前下單，金額 10000，有 2000 折扣）
 * items:
 *   ol-1 → 商品A, 6000 cents (TWD 60), qty 1
 *   ol-2 → 商品B, 4000 cents (TWD 40), qty 1
 */
function makeDefaultOrderContext(orderId = 'order-001'): OrderContext {
	return OrderContext.create({
		orderId,
		orderDate: new Date(Date.now() - 3 * 86400000), // 3 天前
		totalAmountCents: 10000,
		discountAmountCents: 2000,
		currency: 'TWD',
		paymentMethod: 'credit_card',
		items: [
			{
				orderLineId: 'ol-1',
				productId: 'p1',
				productName: '商品A',
				unitPriceCents: 6000,
				quantity: 1,
			},
			{
				orderLineId: 'ol-2',
				productId: 'p2',
				productName: '商品B',
				unitPriceCents: 4000,
				quantity: 1,
			},
		],
	})
}

/**
 * 建立測試服務組合
 *
 * @param options.recentRefundCount - 模擬近期退款次數（預設 0）
 * @param options.policyConfig - 自訂政策設定（預設使用 defaults）
 * @param options.fees - 自訂費用設定（預設 0 費率）
 * @param options.orderContextOverride - 覆蓋 OrderContext
 */
function createTestRefundService(options: {
	recentRefundCount?: number
	policyConfig?: RefundPolicyConfig
	fees?: RefundFees
	orderContextOverride?: (orderId: string) => OrderContext
} = {}): {
	service: RefundApplicationService
	repo: InMemoryRefundRepository
	handler: PaymentRefundHandler
} {
	const repo = new InMemoryRefundRepository()

	const mockOrderQuery: IOrderQueryPort = {
		async getOrderContext(orderId: string) {
			if (options.orderContextOverride) {
				return options.orderContextOverride(orderId)
			}
			return makeDefaultOrderContext(orderId)
		},
	}

	const recentCount = options.recentRefundCount ?? 0
	const mockRefundHistory: IRefundHistoryPort = {
		async countRecentRefunds(_userId: string, _withinDays: number) {
			return recentCount
		},
	}

	const policyConfig = options.policyConfig ?? RefundPolicyConfig.defaults()

	const fees =
		options.fees ??
		RefundFees.create(
			0, // 0% restocking fee
			Money.fromCents(0, 'TWD'), // 0 shipping fee
			['defective', 'wrong_item'] // waived reasons
		)

	const service = new RefundApplicationService(
		repo,
		mockOrderQuery,
		mockRefundHistory,
		policyConfig,
		fees
	)

	const handler = new PaymentRefundHandler(repo, mockLogger)

	return { service, repo, handler }
}

// ──────────────────────────────────────────────────────────
// E2E Tests
// ──────────────────────────────────────────────────────────

describe('E2E: 僅退款完整流程 (refund_only)', () => {
	it('requestRefund → 自動核准 → processRefund → complete（透過 handler）', async () => {
		const { service, repo, handler } = createTestRefundService()

		// 1. 建立退款申請
		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		// 自動核准：狀態應為 approved
		expect(dto.status).toBe('approved')

		// 2. 開始處理退款
		const processingDto = await service.processRefund(dto.id)
		expect(processingDto.status).toBe('processing')

		// 3. 模擬 PaymentRefunded 事件 → 完成退款
		await handler.handlePaymentRefunded({ refundId: dto.id })

		const finalRefund = await repo.findById(dto.id)
		expect(finalRefund!.status.value).toBe('completed')
		expect(finalRefund!.resolvedAt).not.toBeNull()
	})
})

describe('E2E: 退貨退款完整流程 (return_and_refund)', () => {
	it('requestRefund → 自動核准 → markItemsShipped → confirmItemsReceived → processRefund', async () => {
		const { service, repo } = createTestRefundService()

		// 1. 建立退款申請
		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'return_and_refund',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		expect(dto.status).toBe('approved')

		// 2. 標記退貨已出貨
		const shippedDto = await service.markItemsShipped(dto.id, 'TRACK-123')
		expect(shippedDto.status).toBe('awaiting_return')

		// 3. 確認收到退貨商品
		const refund = await repo.findById(dto.id)
		const conditions = refund!.items.map((item) => ({
			returnItemId: item.id,
			condition: 'good',
		}))

		const receivedDto = await service.confirmItemsReceived(dto.id, conditions)
		expect(receivedDto.status).toBe('items_received')

		// 4. 開始處理退款
		const processingDto = await service.processRefund(dto.id)
		expect(processingDto.status).toBe('processing')
	})
})

describe('E2E: 部分退貨折扣分攤計算', () => {
	it('只退 ol-1（商品A 6000 cents），折扣應按比例分攤', async () => {
		const { service, repo } = createTestRefundService()

		// 退單一商品（商品A = 6000 / 10000 = 60% 比例）
		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		expect(dto.calculation).not.toBeNull()

		// DTO 層：驗證計算摘要
		const calcDto = dto.calculation!

		// 商品A 原價 6000，佔總額 10000 的 60%
		// 折扣分攤 = 2000 * 0.6 = 1200
		// 調整後價格 = 6000 - 1200 = 4800
		expect(calcDto.subtotalCents).toBe(4800)
		expect(calcDto.restockingFeeCents).toBe(0) // defective → waived
		expect(calcDto.shippingFeeCents).toBe(0)   // defective → waived
		expect(calcDto.refundAmountCents).toBe(4800)

		// Domain 層：從 repo 取回聚合根，驗證 breakdown 詳細資料
		const refund = await repo.findById(dto.id)
		expect(refund).not.toBeNull()
		const domainCalc = refund!.calculation!

		expect(domainCalc.breakdown).toHaveLength(1)
		expect(domainCalc.breakdown[0].productId).toBe('p1')
		expect(domainCalc.breakdown[0].discountShareCents).toBe(1200)
		expect(domainCalc.breakdown[0].adjustedPriceCents).toBe(4800)
	})
})

describe('E2E: 人工審核拒絕流程', () => {
	it('高金額申請 → 進入 under_review → rejectRefund → verified rejected', async () => {
		// 設定低自動核准上限（只允許 2000 cents）
		const config = RefundPolicyConfig.create({ maxAutoApprovalAmountCents: 2000 })
		const { service } = createTestRefundService({ policyConfig: config })

		// 商品A 金額 6000 > 2000，應進入人工審核
		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		expect(dto.status).toBe('under_review')

		// 拒絕退款
		const rejectedDto = await service.rejectRefund(dto.id, 'reviewer-001', '金額超過限制')
		expect(rejectedDto.status).toBe('rejected')
		expect(rejectedDto.rejectionNote).toBe('金額超過限制')
	})
})

describe('E2E: Saga 補償 — PaymentRefundFailed', () => {
	it('進入 processing → PaymentRefundFailed → 狀態變為 failed', async () => {
		const { service, repo, handler } = createTestRefundService()

		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		// 開始處理
		await service.processRefund(dto.id)

		// 模擬支付失敗事件
		await handler.handlePaymentRefundFailed({
			refundId: dto.id,
			reason: '支付閘道拒絕',
		})

		const failedRefund = await repo.findById(dto.id)
		expect(failedRefund!.status.value).toBe('failed')
	})
})

describe('E2E: 不合法狀態轉換', () => {
	it('嘗試核准一個已完成的退款 → 拋出錯誤', async () => {
		const { service, handler } = createTestRefundService()

		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		// 推進至 completed
		await service.processRefund(dto.id)
		await handler.handlePaymentRefunded({ refundId: dto.id })

		// 嘗試再次核准 completed 狀態的退款 → 應拋出錯誤
		await expect(service.approveRefund(dto.id, 'reviewer-001')).rejects.toThrow(
			'無效的狀態轉換'
		)
	})
})

describe('E2E: 防濫用 — 近期退款次數超過上限', () => {
	it('recentRefundCount > maxRecentRefunds → 進入 under_review（不自動核准）', async () => {
		// 預設 maxRecentRefunds = 3，設定近期次數為 4
		const { service } = createTestRefundService({ recentRefundCount: 4 })

		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		// 應進入人工審核，而非自動核准
		expect(dto.status).toBe('under_review')
	})
})

describe('E2E: 手續費豁免 — 商品瑕疵', () => {
	it('defective 原因 → 退款計算無手續費（0 restocking + 0 shipping）', async () => {
		// 設定有費率的費用，但 defective 豁免
		const fees = RefundFees.create(
			0.1, // 10% restocking fee
			Money.fromCents(300, 'TWD'), // 300 cents shipping fee
			['defective'] // defective reason waived
		)

		const { service } = createTestRefundService({ fees })

		const dto = await service.requestRefund(
			{
				orderId: 'order-001',
				type: 'refund_only',
				items: [{ orderLineId: 'ol-1', quantity: 1, reason: 'defective' }],
			},
			'user-001'
		)

		const calc = dto.calculation!

		// defective 豁免 → 所有費用應為 0
		expect(calc.restockingFeeCents).toBe(0)
		expect(calc.shippingFeeCents).toBe(0)
		expect(calc.totalDeductionsCents).toBe(0)
		// 退款金額應等於 subtotal（無扣除費用）
		expect(calc.refundAmountCents).toBe(calc.subtotalCents)
	})
})
