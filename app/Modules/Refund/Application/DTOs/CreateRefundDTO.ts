/**
 * 建立退款申請 DTO — 接收 HTTP 層的退款請求資料
 */
export interface CreateRefundDTO {
	orderId: string
	type: 'refund_only' | 'return_and_refund'
	items: Array<{
		orderLineId: string
		quantity: number
		reason: string
		reasonDescription?: string
	}>
}
