/**
 * @file RefundRepository.ts
 * @description 退款倉儲實作 — 負責 Refund 聚合根的持久化
 *
 * 使用 IDatabaseAccess Port，與 ORM 無關。
 * 分別使用 refunds 主表與 refund_items 子表。
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import { Refund } from '../../Domain/Entities/Refund'
import { ReturnItem } from '../../Domain/Entities/ReturnItem'
import { RefundId } from '../../Domain/ValueObjects/RefundId'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundStatus } from '../../Domain/ValueObjects/RefundStatus'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundCalculation } from '../../Domain/ValueObjects/RefundCalculation'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'
import { toIntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import type { RefundCompleted } from '../../Domain/Events/RefundCompleted'
import type { ReturnItemsReceived } from '../../Domain/Events/ReturnItemsReceived'
import type { RefundProcessing } from '../../Domain/Events/RefundProcessing'

/**
 * 退款 Repository 實作
 *
 * 不繼承 BaseEventSourcedRepository，使用直接 DB 操作。
 */
export class RefundRepository implements IRefundRepository {
	constructor(
		private readonly db: IDatabaseAccess,
		private readonly eventDispatcher?: IEventDispatcher
	) {}

	/**
	 * 查詢所有退款申請
	 */
	async findAll(params?: { limit?: number; offset?: number }): Promise<Refund[]> {
		let query = this.db.table('refunds')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)

		const rows = await query.select()
		return Promise.all(rows.map((row: any) => this.loadWithItems(row)))
	}

	/**
	 * 根據 ID 查詢退款申請
	 */
	async findById(id: string): Promise<Refund | null> {
		const row = await this.db.table('refunds').where('id', '=', id).first()
		if (!row) return null
		return this.loadWithItems(row)
	}

	/**
	 * 根據訂單 ID 查詢退款申請
	 */
	async findByOrderId(orderId: string): Promise<Refund[]> {
		const rows = await this.db.table('refunds').where('order_id', '=', orderId).select()
		return Promise.all(rows.map((row: any) => this.loadWithItems(row)))
	}

	/**
	 * 根據使用者 ID 查詢退款申請
	 */
	async findByUserId(
		userId: string,
		params?: { limit?: number; offset?: number }
	): Promise<Refund[]> {
		let query = this.db.table('refunds').where('user_id', '=', userId)
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)

		const rows = await query.select()
		return Promise.all(rows.map((row: any) => this.loadWithItems(row)))
	}

	/**
	 * 根據退款狀態查詢
	 */
	async findByStatus(
		status: string,
		params?: { limit?: number; offset?: number }
	): Promise<Refund[]> {
		let query = this.db.table('refunds').where('status', '=', status)
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)

		const rows = await query.select()
		return Promise.all(rows.map((row: any) => this.loadWithItems(row)))
	}

	/**
	 * 儲存退款申請（upsert + 分派事件）
	 */
	async save(refund: Refund): Promise<void> {
		const row = this.toRow(refund)
		const exists = await this.db.table('refunds').where('id', '=', refund.id).first()

		if (exists) {
			await this.db.table('refunds').where('id', '=', refund.id).update(row)
		} else {
			await this.db.table('refunds').insert(row)
		}

		// 重新儲存 refund_items：先刪除舊的，再插入新的
		await this.db.table('refund_items').where('refund_id', '=', refund.id).delete()
		for (const item of refund.items) {
			const itemRow = this.toItemRow(refund.id, item)
			await this.db.table('refund_items').insert(itemRow)
		}

		// 分派整合事件
		if (this.eventDispatcher) {
			const uncommitted = refund.getUncommittedEvents()
			for (const event of uncommitted) {
				const integrationEvent = this.toIntegrationEvent(event)
				if (integrationEvent) {
					await this.eventDispatcher.dispatch(integrationEvent)
				}
			}
		}

		refund.markEventsAsCommitted()
	}

	/**
	 * 刪除退款申請
	 */
	async delete(id: string): Promise<void> {
		await this.db.table('refund_items').where('refund_id', '=', id).delete()
		await this.db.table('refunds').where('id', '=', id).delete()
	}

	/**
	 * 取得總數
	 */
	async count(): Promise<number> {
		return this.db.table('refunds').count()
	}

	// ── 私有輔助 ─────────────────────────────────────────────

	/** 載入退款主表資料 + 子項目，重建 domain */
	private async loadWithItems(row: any): Promise<Refund> {
		const itemRows = await this.db
			.table('refund_items')
			.where('refund_id', '=', row.id)
			.select()

		return this.toDomain(row, itemRows)
	}

	/** 將 domain 物件轉換為主表資料行 */
	private toRow(refund: Refund): Record<string, unknown> {
		const calcJson = refund.calculation
			? JSON.stringify({
					subtotalCents: refund.calculation.subtotalCents,
					restockingFeeCents: refund.calculation.restockingFeeCents,
					shippingFeeCents: refund.calculation.shippingFeeCents,
					totalDeductionsCents: refund.calculation.totalDeductionsCents,
					refundAmountCents: refund.calculation.refundAmountCents,
					currency: refund.calculation.currency,
					breakdown: refund.calculation.breakdown,
				})
			: null

		const policyDetail = refund.policy
			? JSON.stringify({
					type: refund.policy.type,
					rule: refund.policy.rule,
					reviewerId: refund.policy.reviewerId,
					note: refund.policy.note,
				})
			: null

		return {
			id: refund.id,
			order_id: refund.orderId,
			user_id: refund.userId,
			type: refund.type.value,
			status: refund.status.value,
			calculation_json: calcJson,
			policy_type: refund.policy?.type ?? null,
			policy_detail: policyDetail,
			rejection_note: refund.rejectionNote,
			requested_at: refund.requestedAt.toISOString(),
			resolved_at: refund.resolvedAt?.toISOString() ?? null,
			created_at: refund.requestedAt.toISOString(),
			updated_at: new Date().toISOString(),
		}
	}

	/** 將子項目轉換為 refund_items 資料行 */
	private toItemRow(refundId: string, item: ReturnItem): Record<string, unknown> {
		return {
			id: item.id,
			refund_id: refundId,
			product_id: item.productId,
			product_name: item.productName,
			original_price_cents: item.originalPrice.cents,
			original_price_currency: item.originalPrice.currency,
			discount_share_cents: item.discountShare.cents,
			quantity: item.quantity,
			reason: item.reason.value,
			reason_description: item.reason.description ?? null,
			status: item.status,
			condition: item.condition?.value ?? null,
		}
	}

	/** 從資料行重建 Refund domain 物件 */
	private toDomain(row: any, itemRows: any[]): Refund {
		const items = itemRows.map((itemRow: any) => {
			const originalPrice = Money.fromCents(
				Number(itemRow.original_price_cents),
				itemRow.original_price_currency
			)
			const discountShare = Money.fromCents(
				Number(itemRow.discount_share_cents),
				itemRow.original_price_currency
			)
			const reason = RefundReason.from(itemRow.reason, itemRow.reason_description ?? undefined)
			const condition = itemRow.condition ? ItemCondition.from(itemRow.condition) : undefined

			return ReturnItem.reconstitute({
				id: itemRow.id,
				productId: itemRow.product_id,
				productName: itemRow.product_name,
				originalPrice,
				discountShare,
				quantity: Number(itemRow.quantity),
				reason,
				status: itemRow.status,
				condition,
			})
		})

		let calculation: RefundCalculation | null = null
		if (row.calculation_json) {
			try {
				const calc = typeof row.calculation_json === 'string'
					? JSON.parse(row.calculation_json)
					: row.calculation_json

				calculation = RefundCalculation.create(
					Number(calc.subtotalCents),
					Number(calc.restockingFeeCents),
					Number(calc.shippingFeeCents),
					calc.currency,
					calc.breakdown ?? []
				)
			} catch {
				// 忽略解析錯誤
			}
		}

		let policy: PolicyDecision | null = null
		if (row.policy_detail) {
			try {
				const pd = typeof row.policy_detail === 'string'
					? JSON.parse(row.policy_detail)
					: row.policy_detail

				policy = pd.type === 'auto'
					? PolicyDecision.auto(pd.rule ?? '')
					: PolicyDecision.manual(pd.reviewerId ?? '', pd.note ?? null)
			} catch {
				// 忽略解析錯誤
			}
		}

		return Refund.reconstitute({
			id: row.id,
			refundId: RefundId.from(row.id),
			orderId: row.order_id,
			userId: row.user_id,
			type: RefundType.from(row.type),
			status: RefundStatus.from(row.status),
			items,
			calculation,
			policy,
			rejectionNote: row.rejection_note ?? null,
			requestedAt: new Date(row.requested_at),
			resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
		})
	}

	/** 將 domain 事件轉換為整合事件（僅需廣播的事件） */
	private toIntegrationEvent(event: any): any {
		switch (event.eventType) {
			case 'RefundCompleted': {
				const e = event as RefundCompleted
				return toIntegrationEvent(
					'RefundCompleted',
					'Refund',
					{
						refundId: e.aggregateId,
						orderId: String(e.data.orderId),
						refundAmountCents: Number(e.data.refundAmountCents),
						currency: String(e.data.currency),
					},
					e.aggregateId
				)
			}
			case 'ReturnItemsReceived': {
				const e = event as ReturnItemsReceived
				return toIntegrationEvent(
					'ReturnItemsReceived',
					'Refund',
					{
						refundId: e.aggregateId,
						itemConditions: String(e.data.itemConditions),
					},
					e.aggregateId
				)
			}
			case 'RefundProcessing': {
				const e = event as RefundProcessing
				return toIntegrationEvent(
					'RefundProcessing',
					'Refund',
					{
						refundId: e.aggregateId,
						refundAmountCents: Number(e.data.refundAmountCents),
						currency: String(e.data.currency),
					},
					e.aggregateId
				)
			}
			default:
				return null
		}
	}
}
