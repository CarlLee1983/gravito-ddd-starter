/**
 * @file OrderPlacedAuditHandler.ts
 * @description 訂單建立審計 Handler
 *
 * 訂閱 OrderPlaced 事件，記錄訂單建立的審計日誌。
 *
 * Role: Application Layer - Event Handler
 */

import { AuditEntry } from '../../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { OrderPlaced } from '../../Domain/Events/AuditLogEvents'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

export class OrderPlacedAuditHandler {
	constructor(
		private readonly repository: IAuditEntryRepository,
		private readonly logger: ILogger
	) {}

	async handle(event: OrderPlaced): Promise<void> {
		const { orderId, userId, total, currency } = event.data

		this.logger.info(`[AuditLog] Recording OrderPlaced audit for order ${orderId}`)

		try {
			const entry = AuditEntry.create({
				userId: String(userId),
				entityType: 'Order',
				entityId: String(orderId),
				action: AuditAction.OrderCreated,
				severity: AuditSeverity.INFO,
				description: `Order placed: ${total} ${currency}`,
			})

			await this.repository.save(entry)

			this.logger.debug(`[AuditLog] OrderPlaced audit saved: ${entry.id}`)
		} catch (error) {
			this.logger.error(`[AuditLog] Failed to record OrderPlaced audit for order ${orderId}`, error)
			throw error
		}
	}
}
