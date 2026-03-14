/**
 * @file InitiatePaymentDTO.ts
 * @description 發起支付請求數據傳輸物件
 */

/**
 * 發起支付 DTO
 */
export interface InitiatePaymentDTO {
	/** 訂單 ID */
	orderId: string
	/** 用戶 ID */
	userId: string
	/** 金額（分為單位） */
	amountCents: number
	/** 支付方式代碼 */
	paymentMethod: string
}
