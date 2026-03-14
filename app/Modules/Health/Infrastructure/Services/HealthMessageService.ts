/**
 * @file HealthMessageService.ts
 * @description 健康檢查訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的健康檢查訊息方法。
 */

import type { IHealthMessages } from '@/Foundation/Infrastructure/Ports/Messages/IHealthMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class HealthMessageService implements IHealthMessages {
	constructor(private translator: ITranslator) {}

	healthCheckFailed(): string {
		return this.translator.trans('health.health.check_failed')
	}
}
