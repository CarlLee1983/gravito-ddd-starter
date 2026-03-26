import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import type { IOrderQueryPort } from '../../Domain/Ports/IOrderQueryPort'
import type { IRefundHistoryPort } from '../../Domain/Ports/IRefundHistoryPort'
import { Refund } from '../../Domain/Entities/Refund'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { Money } from '../../Domain/ValueObjects/Money'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'
import type { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import type { RefundFees } from '../../Domain/ValueObjects/RefundFees'
import { RefundPolicy } from '../../Domain/Services/RefundPolicy'
import { RefundCalculator } from '../../Domain/Services/RefundCalculator'
import { toRefundDTO } from '../DTOs/RefundDTO'
import type { RefundDTO } from '../DTOs/RefundDTO'
import type { CreateRefundDTO } from '../DTOs/CreateRefundDTO'
import type { ItemConditionDTO } from '../DTOs/ItemConditionDTO'

/**
 * 退款應用服務 — 協調 Domain 層業務邏輯，處理退款申請的完整生命週期
 *
 * 依賴倒置原則：只依賴 Port 介面，不依賴具體實現。
 */
export class RefundApplicationService {
	private readonly policy = new RefundPolicy()
	private readonly calculator = new RefundCalculator()

	constructor(
		private readonly refundRepository: IRefundRepository,
		private readonly orderQuery: IOrderQueryPort,
		private readonly refundHistory: IRefundHistoryPort,
		private readonly policyConfig: RefundPolicyConfig,
		private readonly fees: RefundFees
	) {}

	/**
	 * 建立退款申請
	 *
	 * 1. 查詢訂單上下文
	 * 2. 建立 Refund 聚合根
	 * 3. 計算退款金額
	 * 4. 提交審核
	 * 5. 評估政策（自動核准或人工審核）
	 * 6. 儲存並回傳 DTO
	 */
	async requestRefund(dto: CreateRefundDTO, userId: string): Promise<RefundDTO> {
		const orderContext = await this.orderQuery.getOrderContext(dto.orderId)

		const domainItems = dto.items.map((itemDto) => {
			const orderLine = orderContext.items.find((ol) => ol.orderLineId === itemDto.orderLineId)
			if (!orderLine) {
				throw new Error(`找不到訂單明細: ${itemDto.orderLineId}`)
			}

			const reason = RefundReason.from(itemDto.reason, itemDto.reasonDescription)
			const originalPrice = Money.fromCents(orderLine.unitPriceCents, orderContext.currency)

			return {
				productId: orderLine.productId,
				productName: orderLine.productName,
				originalPrice,
				quantity: itemDto.quantity,
				reason,
			}
		})

		const refund = Refund.create({
			orderId: dto.orderId,
			userId,
			type: RefundType.from(dto.type),
			items: domainItems,
		})

		const calculation = this.calculator.calculate(refund.items, orderContext, this.fees)
		refund.setCalculation(calculation)

		const recentCount = await this.refundHistory.countRecentRefunds(
			userId,
			this.policyConfig.recentRefundWindowDays
		)

		refund.submitForReview()

		const decision = this.policy.evaluate(refund, orderContext, recentCount, this.policyConfig)

		if (decision.isAuto()) {
			refund.approve(decision)
		}

		await this.refundRepository.save(refund)

		return toRefundDTO(refund)
	}

	/**
	 * 人工核准退款申請
	 */
	async approveRefund(refundId: string, reviewerId?: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)

		const decision = reviewerId
			? PolicyDecision.manual(reviewerId, null)
			: PolicyDecision.auto('manual_override')

		refund.approve(decision)
		await this.refundRepository.save(refund)

		return toRefundDTO(refund)
	}

	/**
	 * 拒絕退款申請
	 */
	async rejectRefund(refundId: string, reviewerId: string, note: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)

		refund.reject(reviewerId, note)
		await this.refundRepository.save(refund)

		return toRefundDTO(refund)
	}

	/**
	 * 標記退貨商品已出貨
	 */
	async markItemsShipped(refundId: string, trackingNumber?: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)

		refund.markItemsShipped(trackingNumber)
		await this.refundRepository.save(refund)

		return toRefundDTO(refund)
	}

	/**
	 * 確認收到退貨商品，並記錄各項目狀態
	 */
	async confirmItemsReceived(
		refundId: string,
		conditions: ItemConditionDTO[]
	): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)

		const domainConditions = conditions.map((c) => ({
			returnItemId: c.returnItemId,
			condition: ItemCondition.from(c.condition),
		}))

		refund.confirmItemsReceived(domainConditions)
		await this.refundRepository.save(refund)

		return toRefundDTO(refund)
	}

	/**
	 * 開始處理退款金額
	 */
	async processRefund(refundId: string): Promise<RefundDTO> {
		const refund = await this.findRefundOrFail(refundId)

		if (!refund.calculation) {
			throw new Error(`退款申請尚未計算退款金額: ${refundId}`)
		}

		const refundAmount = Money.fromCents(
			refund.calculation.refundAmountCents,
			refund.calculation.currency
		)

		refund.startProcessing(refundAmount)
		await this.refundRepository.save(refund)

		return toRefundDTO(refund)
	}

	/**
	 * 查詢退款申請，不存在時拋出錯誤
	 */
	private async findRefundOrFail(refundId: string): Promise<Refund> {
		const refund = await this.refundRepository.findById(refundId)
		if (!refund) {
			throw new Error(`退款申請不存在: ${refundId}`)
		}
		return refund
	}
}
