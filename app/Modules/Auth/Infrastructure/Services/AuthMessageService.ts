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
	constructor(private translator: ITranslator) {}

	validationEmailPasswordRequired(): string {
		return this.translator.trans('auth.validation.email_and_password_required')
	}

	loginInvalidCredentials(): string {
		return this.translator.trans('auth.login.invalid_credentials')
	}

	loginFailed(): string {
		return this.translator.trans('auth.login.failed')
	}

	logoutSuccess(): string {
		return this.translator.trans('auth.logout.success')
	}

	logoutFailed(): string {
		return this.translator.trans('auth.logout.failed')
	}

	logoutTokenMissing(): string {
		return this.translator.trans('auth.logout.token_missing')
	}

	profileUnauthorized(): string {
		return this.translator.trans('auth.profile.unauthorized')
	}

	profileNotFound(): string {
		return this.translator.trans('auth.profile.not_found')
	}

	profileQueryFailed(): string {
		return this.translator.trans('auth.profile.query_failed')
	}

	refreshFailed(): string {
		return this.translator.trans('auth.refresh.failed')
	}

	refreshTokenMissing(): string {
		return this.translator.trans('auth.refresh.token_missing')
	}

	registrationEmailDuplicate(): string {
		return this.translator.trans('auth.registration.email_duplicate')
	}

	registrationFailed(): string {
		return this.translator.trans('auth.registration.failed')
	}
}
