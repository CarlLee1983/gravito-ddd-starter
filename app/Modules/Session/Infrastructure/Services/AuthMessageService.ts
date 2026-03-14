/**
 * @file AuthMessageService.ts
 * @description 認證訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的認證訊息方法。
 * 好處：
 * - 編譯時檢查（無拼寫錯誤）
 * - 簡潔的方法名稱（authMessages.loginInvalidCredentials()）
 * - 集中管理翻譯鍵
 * - 易於測試和重構
 */

import type { IAuthMessages } from '@/Foundation/Infrastructure/Ports/Messages/IAuthMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class AuthMessageService implements IAuthMessages {
	/**
	 * 建構子
	 *
	 * @param translator - 翻譯服務
	 */
	constructor(private translator: ITranslator) {}

	/**
	 * 取得電子郵件和密碼必填的錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	validationEmailPasswordRequired(): string {
		return this.translator.trans('auth.validation.email_and_password_required')
	}

	/**
	 * 取得無效憑證的登入錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	loginInvalidCredentials(): string {
		return this.translator.trans('auth.login.invalid_credentials')
	}

	/**
	 * 取得登入失敗的錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	loginFailed(): string {
		return this.translator.trans('auth.login.failed')
	}

	/**
	 * 取得登出成功的訊息
	 *
	 * @returns 成功訊息字串
	 */
	logoutSuccess(): string {
		return this.translator.trans('auth.logout.success')
	}

	/**
	 * 取得登出失敗的錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	logoutFailed(): string {
		return this.translator.trans('auth.logout.failed')
	}

	/**
	 * 取得缺少 Token 的登出錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	logoutTokenMissing(): string {
		return this.translator.trans('auth.logout.token_missing')
	}

	/**
	 * 取得未經授權的個人資料存取錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	profileUnauthorized(): string {
		return this.translator.trans('auth.profile.unauthorized')
	}

	/**
	 * 取得個人資料未找到的錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	profileNotFound(): string {
		return this.translator.trans('auth.profile.not_found')
	}

	/**
	 * 取得個人資料查詢失敗的錯誤訊息
	 *
	 * @returns 錯誤訊息字串
	 */
	profileQueryFailed(): string {
		return this.translator.trans('auth.profile.query_failed')
	}
}
