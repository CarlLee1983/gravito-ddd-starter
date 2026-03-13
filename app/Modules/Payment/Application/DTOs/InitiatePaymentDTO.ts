/**
 * 發起支付 DTO
 */
export interface InitiatePaymentDTO {
	orderId: string
	userId: string
	amountCents: number // 金額（分為單位）
	paymentMethod: string // 支付方式代碼
}
