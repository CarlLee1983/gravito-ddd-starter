/**
 * 應用層異常體系 (Application Exceptions)
 *
 * @module AppException
 * @description
 * 提供全域統一的異常基底類別 `AppException`，所有自訂業務異常應繼承自此。
 * 包含機器可讀的錯誤代碼 (code)、使用者訊息 (message) 以及 HTTP 狀態碼。
 *
 * **DDD 角色**
 * - 核心：Application Exception（應用程式異常）
 * - 職責：標準化錯誤處理，確保展示層能正確翻譯業務錯誤為 API 響應。
 */

/**
 * 通用應用程式異常類別
 *
 * @extends {Error}
 */
export class AppException extends Error {
	/**
	 * 建構子
	 *
	 * @param {string} code - 錯誤代碼（例如：'NOT_FOUND'）
	 * @param {string} message - 錯誤訊息
	 * @param {number} [statusCode=400] - HTTP 狀態碼
	 * @param {Record<string, any>} [details] - 額外的錯誤細節
	 */
	constructor(
		public readonly code: string,
		public readonly message: string,
		public readonly statusCode: number = 400,
		public readonly details?: Record<string, any>,
	) {
		super(message)
		this.name = this.constructor.name
	}

	/**
	 * 轉換為 JSON 物件
	 *
	 * @returns {object} JSON 格式的錯誤物件
	 */
	toJSON() {
		return {
			code: this.code,
			message: this.message,
			details: this.details,
		}
	}
}

/**
 * 404 - 資源不存在異常
 *
 * @extends {AppException}
 */
export class NotFoundException extends AppException {
	/**
	 * @param {string} [message='Resource not found'] - 錯誤訊息
	 */
	constructor(message: string = 'Resource not found') {
		super('NOT_FOUND', message, 404)
	}
}

/**
 * 422 - 驗證失敗異常
 *
 * @extends {AppException}
 */
export class ValidationException extends AppException {
	/**
	 * @param {Record<string, string[]>} errors - 欄位驗證錯誤詳細資訊
	 */
	constructor(public errors: Record<string, string[]>) {
		super('VALIDATION_ERROR', 'Validation failed', 422, { errors })
	}
}

/**
 * 409 - 業務邏輯衝突異常
 *
 * @extends {AppException}
 */
export class ConflictException extends AppException {
	/**
	 * @param {string} message - 衝突原因描述
	 */
	constructor(message: string) {
		super('CONFLICT', message, 409)
	}
}

/**
 * 500 - 伺服器內部錯誤異常
 *
 * @extends {AppException}
 */
export class InternalException extends AppException {
	/**
	 * @param {string} [message='Internal server error'] - 錯誤訊息
	 */
	constructor(message: string = 'Internal server error') {
		super('INTERNAL_ERROR', message, 500)
	}
}
