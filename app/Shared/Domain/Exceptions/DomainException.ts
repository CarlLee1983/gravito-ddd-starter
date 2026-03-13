/**
 * @file DomainException.ts
 * @description 領域層異常基底類別
 *
 * DDD 中的異常應該在領域層定義，表達業務規則的違反。
 * 應用層與展示層應根據異常型別提供適當的響應。
 *
 * 設計原則：
 * - 異常應有明確的業務語義
 * - 異常名稱應表達「什麼業務規則被違反」
 * - 不應使用字串比對來判斷異常型別
 * - Controller 可根據異常型別自動映射 HTTP 狀態碼
 */

/**
 * 領域異常基底類別
 *
 * 所有領域異常應繼承此類別，以便於異常處理與日誌追蹤。
 */
export abstract class DomainException extends Error {
	/**
	 * 建構子
	 *
	 * @param message - 異常訊息
	 * @param public readonly code - 業務錯誤碼 (用於 API 回應)
	 * @param public readonly statusCode - HTTP 狀態碼 (預設 400)
	 */
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 400
	) {
		super(message)
		this.name = this.constructor.name
		Object.setPrototypeOf(this, DomainException.prototype)
	}

	/**
	 * 轉換為 API 回應格式
	 *
	 * @returns 結構化的錯誤響應
	 */
	toJSON() {
		return {
			error: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
		}
	}
}
