/**
 * 支付回應 DTO
 */
export interface PaymentResponseDTO {
	id: string
	orderId: string
	userId: string
	amountCents: number
	amountTWD: number
	paymentMethod: string
	status: string
	transactionId?: string
	failureReason?: string
	createdAt: string
	updatedAt: string
}
