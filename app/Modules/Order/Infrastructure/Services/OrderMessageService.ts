/**
 * @file OrderMessageService.ts
 * @description 訂單訊息服務實現
 */

import type { IOrderMessages } from '@/Foundation/Infrastructure/Ports/Messages/IOrderMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class OrderMessageService implements IOrderMessages {
	constructor(private translator: ITranslator) {}

	notFound(): string {
		return this.translator.trans('order.not_found')
	}

	missingRequiredFields(): string {
		return this.translator.trans('order.missing_required_fields')
	}

	createFailed(): string {
		return this.translator.trans('order.create_failed')
	}

	getFailed(): string {
		return this.translator.trans('order.get_failed')
	}

	getListFailed(): string {
		return this.translator.trans('order.get_list_failed')
	}

	confirmFailed(): string {
		return this.translator.trans('order.confirm_failed')
	}

	shipFailed(): string {
		return this.translator.trans('order.ship_failed')
	}

	cancelReasonRequired(): string {
		return this.translator.trans('order.cancel_reason_required')
	}

	cancelFailed(): string {
		return this.translator.trans('order.cancel_failed')
	}
}
