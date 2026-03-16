/**
 * @file IOrderMessages.ts
 * @description 訂單模組訊息 Port 介面
 */

export interface IOrderMessages {
	/**
	 * 訂單不存在
	 */
	notFound(): string

	/**
	 * 缺少必要欄位 (userId 和 lines)
	 */
	missingRequiredFields(): string

	/**
	 * 建立訂單失敗
	 */
	createFailed(): string

	/**
	 * 獲取訂單失敗
	 */
	getFailed(): string

	/**
	 * 獲取訂單列表失敗
	 */
	getListFailed(): string

	/**
	 * 確認訂單失敗
	 */
	confirmFailed(): string

	/**
	 * 訂單發貨失敗
	 */
	shipFailed(): string

	/**
	 * 取消原因不能為空
	 */
	cancelReasonRequired(): string

	/**
	 * 取消訂單失敗
	 */
	cancelFailed(): string
}
