/**
 * 退款歷史查詢 Port — 用於審核策略評估時查詢近期退款次數
 *
 * 定義在消費者（Refund Domain 策略服務）側，由 Infrastructure 層實現。
 */
export interface IRefundHistoryPort {
	countRecentRefunds(userId: string, withinDays: number): Promise<number>
}
