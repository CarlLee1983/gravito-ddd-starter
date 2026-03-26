/**
 * @file PaymentFailedAuditHandler.ts
 * @description 支付失敗審計 Handler
 *
 * 訂閱 PaymentFailed 事件，記錄支付失敗的審計日誌。
 *
 * Role: Application Layer - Event Handler
 */

import { AuditEntry, SYSTEM_USER_ID } from '../../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { PaymentFailed } from '../../Domain/Events/AuditLogEvents'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

export class PaymentFailedAuditHandler {
	constructor(
		private readonly repository: IAuditEntryRepository,
		private readonly logger: ILogger
	) {}

	async handle(event: PaymentFailed): Promise<void> {
		const { orderId, reason } = event.data

		this.logger.info(`[AuditLog] Recording PaymentFailed audit for order ${orderId}`)

		try {
			const entry = AuditEntry.create({
				userId: SYSTEM_USER_ID,
				entityType: 'Payment',
				entityId: String(event.aggregateId),
				action: AuditAction.PaymentFailed,
				severity: AuditSeverity.ERROR,
				description: `Payment failed for order ${orderId}: ${reason}`,
			})

			await this.repository.save(entry)

			this.logger.debug(`[AuditLog] PaymentFailed audit saved: ${entry.id}`)
		} catch (error) {
			this.logger.error(`[AuditLog] Failed to record PaymentFailed audit for order ${orderId}`, error)
			throw error
		}
	}
}
