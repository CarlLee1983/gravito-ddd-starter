/**
 * @file INotificationMessages.ts
 * @description Notification 模組訊息 Port (C4 層)
 *
 * 定義 Notification 模組所有 Controller 回應訊息的契約。
 * Role: Presentation Layer - Port interface
 */

export interface INotificationMessages {
	/**
	 * 訂單確認信主題
	 * @param orderId - 訂單 ID
	 */
	orderConfirmSubject(orderId: string): string

	/**
	 * 訂單確認信成功訊息
	 * @param orderId - 訂單 ID
	 */
	orderConfirmSuccess(orderId: string): string

	/**
	 * 支付成功信主題
	 * @param orderId - 訂單 ID
	 */
	paymentSuccessSubject(orderId: string): string

	/**
	 * 支付成功信成功訊息
	 * @param orderId - 訂單 ID
	 */
	paymentSuccessNotified(orderId: string): string

	/**
	 * 支付失敗信主題
	 * @param orderId - 訂單 ID
	 */
	paymentFailedSubject(orderId: string): string

	/**
	 * 支付失敗信成功訊息
	 * @param orderId - 訂單 ID
	 */
	paymentFailedNotified(orderId: string): string
}
