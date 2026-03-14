/**
 * @file UserMessageService.ts
 * @description 用戶訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的用戶訊息方法。
 * 好處：
 * - 編譯時檢查（無拼寫錯誤）
 * - 簡潔的方法名稱
 * - 集中管理翻譯鍵
 * - 易於測試和重構
 */

import type { IUserMessages } from '@/Foundation/Infrastructure/Ports/Messages/IUserMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class UserMessageService implements IUserMessages {
	constructor(private translator: ITranslator) {}

	validationMissingFields(): string {
		return this.translator.trans('user.validation.missing_fields')
	}

	userCreatedSuccessfully(): string {
		return this.translator.trans('user.user.created_successfully')
	}

	validationUserIdRequired(): string {
		return this.translator.trans('user.validation.user_id_required')
	}

	userNotFound(): string {
		return this.translator.trans('user.user.not_found')
	}
}
