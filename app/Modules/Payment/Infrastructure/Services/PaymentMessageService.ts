/**
 * @file PaymentMessageService.ts
 * @description 支付訊息服務實現
 */

import type { IPaymentMessages } from '@/Foundation/Infrastructure/Ports/Messages/IPaymentMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class PaymentMessageService implements IPaymentMessages {
	constructor(private translator: ITranslator) {}

	missingPaymentId(): string {
		return this.translator.trans('payment.missing_payment_id')
	}

	paymentNotFound(): string {
		return this.translator.trans('payment.payment_not_found')
	}

	unknown_error(): string {
		return this.translator.trans('payment.unknown_error')
	}
}
