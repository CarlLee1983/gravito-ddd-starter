/**
 * @file NotificationMessageService.ts
 * @description Notification 訊息服務實現
 *
 * Role: Infrastructure Layer - Service implementation
 */

import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { INotificationMessages } from '../../Presentation/Ports/INotificationMessages'

export class NotificationMessageService implements INotificationMessages {
	constructor(private readonly translator: ITranslator) {}

	orderConfirmSubject(orderId: string): string {
		return this.translator.trans('notification.order_confirm_subject', { orderId })
	}

	orderConfirmSuccess(orderId: string): string {
		return this.translator.trans('notification.order_confirm_success', { orderId })
	}

	paymentSuccessSubject(orderId: string): string {
		return this.translator.trans('notification.payment_success_subject', { orderId })
	}

	paymentSuccessNotified(orderId: string): string {
		return this.translator.trans('notification.payment_success_notified', { orderId })
	}

	paymentFailedSubject(orderId: string): string {
		return this.translator.trans('notification.payment_failed_subject', { orderId })
	}

	paymentFailedNotified(orderId: string): string {
		return this.translator.trans('notification.payment_failed_notified', { orderId })
	}

	missingRecipient(): string {
		return this.translator.trans('notification.missing_recipient')
	}

	notificationSent(): string {
		return this.translator.trans('notification.sent_success')
	}

	logsCleared(): string {
		return this.translator.trans('notification.logs_cleared')
	}

	missingLogId(): string {
		return this.translator.trans('notification.missing_log_id')
	}

	logNotFound(): string {
		return this.translator.trans('notification.log_not_found')
	}
}
