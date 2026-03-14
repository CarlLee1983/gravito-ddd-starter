/**
 * @file IUserMessages.ts
 * @description 用戶模組訊息 Port 介面
 *
 * 定義所有用戶模組相關的使用者訊息。
 * 實現應在 User Module 的 Infrastructure 層。
 *
 * 作用：
 * - 類型安全的訊息管理
 * - 編譯時檢查（避免字符串鍵拼寫錯誤）
 * - 統一的訊息格式和參數管理
 */

export interface IUserMessages {
	/**
	 * 驗證錯誤：缺少必填欄位
	 */
	validationMissingFields(): string

	/**
	 * 操作成功：用戶建立成功
	 */
	userCreatedSuccessfully(): string

	/**
	 * 驗證錯誤：用戶 ID 必填
	 */
	validationUserIdRequired(): string

	/**
	 * 資源不存在：用戶未找到
	 */
	userNotFound(): string
}
