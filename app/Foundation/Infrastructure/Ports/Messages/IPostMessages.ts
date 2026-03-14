/**
 * @file IPostMessages.ts
 * @description 文章模組訊息 Port 介面
 *
 * 定義所有文章模組相關的使用者訊息。
 * 實現應在 Post Module 的 Infrastructure 層。
 */

export interface IPostMessages {
	/**
	 * 驗證錯誤：缺少必填欄位
	 */
	validationMissingFields(): string

	/**
	 * 驗證錯誤：ID 必填
	 */
	validationIdRequired(): string

	/**
	 * 資源不存在：文章未找到
	 */
	postNotFound(): string

	/**
	 * 操作成功：文章建立成功
	 */
	postCreatedSuccessfully(): string
}
