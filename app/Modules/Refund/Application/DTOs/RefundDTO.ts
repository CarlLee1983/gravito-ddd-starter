import type { Refund } from '../../Domain/Entities/Refund'

/**
 * 退貨項目 DTO
 */
export interface ReturnItemDTO {
	id: string
	productId: string
	productName: string
	originalPriceCents: number
	discountShareCents: number
	quantity: number
	reason: string
	status: string
	condition: string | null
}

/**
 * 退款計算結果 DTO
 */
export interface RefundCalculationDTO {
	subtotalCents: number
	restockingFeeCents: number
	shippingFeeCents: number
	totalDeductionsCents: number
	refundAmountCents: number
	currency: string
}

/**
 * 退款申請 DTO — 呈現層使用的完整退款資料
 */
export interface RefundDTO {
	id: string
	orderId: string
	userId: string
	type: string
	status: string
	items: ReturnItemDTO[]
	calculation: RefundCalculationDTO | null
	policyType: string | null
	rejectionNote: string | null
	requestedAt: string
	resolvedAt: string | null
}

/**
 * 將 Refund Domain 物件轉換為 RefundDTO
 */
export function toRefundDTO(refund: Refund): RefundDTO {
	const items: ReturnItemDTO[] = refund.items.map((item) => ({
		id: item.id,
		productId: item.productId,
		productName: item.productName,
		originalPriceCents: item.originalPrice.cents,
		discountShareCents: item.discountShare.cents,
		quantity: item.quantity,
		reason: item.reason.toString(),
		status: item.status,
		condition: item.condition?.value ?? null,
	}))

	const calculation: RefundCalculationDTO | null = refund.calculation
		? {
				subtotalCents: refund.calculation.subtotalCents,
				restockingFeeCents: refund.calculation.restockingFeeCents,
				shippingFeeCents: refund.calculation.shippingFeeCents,
				totalDeductionsCents: refund.calculation.totalDeductionsCents,
				refundAmountCents: refund.calculation.refundAmountCents,
				currency: refund.calculation.currency,
			}
		: null

	return {
		id: refund.id,
		orderId: refund.orderId,
		userId: refund.userId,
		type: refund.type.value,
		status: refund.status.value,
		items,
		calculation,
		policyType: refund.policy?.type ?? null,
		rejectionNote: refund.rejectionNote,
		requestedAt: refund.requestedAt.toISOString(),
		resolvedAt: refund.resolvedAt?.toISOString() ?? null,
	}
}
