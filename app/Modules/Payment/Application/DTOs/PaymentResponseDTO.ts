/**
 * @file PaymentResponseDTO.ts
 * @description 支付回應數據傳輸物件
 */

/**
 * 支付回應 DTO
 */
export interface PaymentResponseDTO {
	/** 支付 ID */
	id: string
	/** 訂單 ID */
	orderId: string
	/** 用戶 ID */
	userId: string
	/** 金額（分） */
	amountCents: number
	/** 金額（台幣） */
	amountTWD: number
	/** 支付方式 */
	paymentMethod: string
	/** 支付狀態 */
	status: string
	/** 交易 ID */
	transactionId?: string
	/** 失敗原因 */
	failureReason?: string
	/** 建立時間 */
	createdAt: string
	/** 更新時間 */
	updatedAt: string
}
