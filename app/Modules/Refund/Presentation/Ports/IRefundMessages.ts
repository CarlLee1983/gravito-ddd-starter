/**
 * @file IRefundMessages.ts
 * @description 退款模組訊息 Port 介面
 *
 * 定義所有退款相關的使用者訊息。
 * 實現應在 Refund Module 的 Infrastructure 層。
 */

export interface IRefundMessages {
	/**
	 * 退款申請不存在
	 */
	notFound(): string

	/**
	 * 退款正在處理中（狀態衝突）
	 */
	alreadyProcessing(): string

	/**
	 * 無效的狀態轉換
	 */
	invalidStatusTransition(from: string, to: string): string

	/**
	 * 退款申請已提交成功
	 */
	requestSuccess(): string

	/**
	 * 退款申請已通過審核
	 */
	approveSuccess(): string

	/**
	 * 退款申請已拒絕
	 */
	rejectSuccess(): string

	/**
	 * 退貨已標記寄出
	 */
	itemsShippedSuccess(): string

	/**
	 * 退貨已確認收到
	 */
	itemsReceivedSuccess(): string

	/**
	 * 退款完成（含金額）
	 */
	refundCompleted(amount: string): string

	/**
	 * 退款失敗
	 */
	refundFailed(): string

	/**
	 * 缺少必要欄位
	 */
	missingRequiredFields(): string

	/**
	 * 退款金額超過訂單金額
	 */
	exceedsOrderAmount(): string

	/**
	 * 此訂單不符合退款條件
	 */
	orderNotEligible(): string
}
