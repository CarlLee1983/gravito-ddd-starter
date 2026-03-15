/**
 * @file ICartMessages.ts
 * @description 購物車模組訊息 Port 介面
 *
 * 定義所有購物車相關的使用者訊息。
 * 實現應在 Cart Module 的 Infrastructure 層。
 */

export interface ICartMessages {
	/**
	 * 購物車不存在
	 */
	notFound(): string

	/**
	 * 缺少必要欄位（商品 ID 或數量）
	 */
	missingRequiredFields(): string

	/**
	 * 購物車狀態已變更（樂觀鎖衝突）
	 */
	stateChangedConflict(): string

	/**
	 * 缺少數量欄位
	 */
	missingQuantityField(): string

	/**
	 * 購物車已清空
	 */
	clearSuccess(): string

	/**
	 * 結帳成功，訂單已建立
	 */
	checkoutSuccess(): string
}
