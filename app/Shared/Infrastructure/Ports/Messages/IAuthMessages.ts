/**
 * @file IAuthMessages.ts
 * @description 認證模組訊息 Port 介面
 *
 * 定義所有認證相關的使用者訊息。
 * 實現應在 Session Module 的 Infrastructure 層。
 *
 * 作用：
 * - 類型安全的訊息管理
 * - 編譯時檢查（避免字符串鍵拼寫錯誤）
 * - 統一的訊息格式和參數管理
 */

export interface IAuthMessages {
	/**
	 * 驗證錯誤：郵箱和密碼必填
	 */
	validationEmailPasswordRequired(): string

	/**
	 * 登入失敗：無效的認證信息
	 */
	loginInvalidCredentials(): string

	/**
	 * 登入失敗：通用錯誤
	 */
	loginFailed(): string

	/**
	 * 登出成功
	 */
	logoutSuccess(): string

	/**
	 * 登出失敗
	 */
	logoutFailed(): string

	/**
	 * 未提供 Token
	 */
	logoutTokenMissing(): string

	/**
	 * 授權失敗：用戶未認證
	 */
	profileUnauthorized(): string

	/**
	 * 用戶不存在
	 */
	profileNotFound(): string

	/**
	 * 查詢用戶失敗
	 */
	profileQueryFailed(): string
}
