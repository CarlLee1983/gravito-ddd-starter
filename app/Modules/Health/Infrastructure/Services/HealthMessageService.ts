/**
 * @file HealthMessageService.ts
 * @description 健康檢查訊息服務實現
 */

import type { IHealthMessages } from '@/Foundation/Infrastructure/Ports/Messages/IHealthMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 健康檢查訊息服務
 * 提供多國語言翻譯的健康檢查訊息
 */
export class HealthMessageService implements IHealthMessages {
	/**
	 * @param translator - 翻譯服務介面
	 */
	constructor(private translator: ITranslator) {}

	/**
	 * 獲取健康檢查失敗訊息
	 *
	 * @returns 翻譯後的失敗訊息
	 */
	healthCheckFailed(): string {
		return this.translator.trans('health.health.check_failed')
	}
}
