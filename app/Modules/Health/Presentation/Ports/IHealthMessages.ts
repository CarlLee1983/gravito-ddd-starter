/**
 * @file IHealthMessages.ts
 * @description 健康檢查模組訊息 Port 介面
 *
 * 定義所有健康檢查相關的使用者訊息。
 * 實現應在 Health Module 的 Infrastructure 層。
 */

export interface IHealthMessages {
	/**
	 * 操作失敗：健康檢查失敗
	 */
	healthCheckFailed(): string
}
