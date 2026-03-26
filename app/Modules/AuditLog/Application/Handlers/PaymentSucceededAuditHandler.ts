/**
 * @file PaymentSucceededAuditHandler.ts
 * @description 支付成功審計 Handler
 *
 * 訂閱 PaymentSucceeded 事件，記錄支付成功的審計日誌。
 *
 * Role: Application Layer - Event Handler
 */

import { AuditEntry, SYSTEM_USER_ID } from '../../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { PaymentSucceeded } from '../../Domain/Events/AuditLogEvents'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

export class PaymentSucceededAuditHandler {
	constructor(
		private readonly repository: IAuditEntryRepository,
		private readonly logger: ILogger
	) {}

	async handle(event: PaymentSucceeded): Promise<void> {
		const { orderId, transactionId } = event.data

		this.logger.info(`[AuditLog] Recording PaymentSucceeded audit for order ${orderId}`)

		try {
			const entry = AuditEntry.create({
				userId: SYSTEM_USER_ID,
				entityType: 'Payment',
				entityId: String(event.aggregateId),
				action: AuditAction.PaymentSucceeded,
				severity: AuditSeverity.INFO,
				description: `Payment succeeded for order ${orderId}, txn: ${transactionId}`,
			})

			await this.repository.save(entry)

			this.logger.debug(`[AuditLog] PaymentSucceeded audit saved: ${entry.id}`)
		} catch (error) {
			this.logger.error(`[AuditLog] Failed to record PaymentSucceeded audit for order ${orderId}`, error)
			throw error
		}
	}
}
