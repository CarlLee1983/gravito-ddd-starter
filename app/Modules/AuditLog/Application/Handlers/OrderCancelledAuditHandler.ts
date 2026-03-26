/**
 * @file OrderCancelledAuditHandler.ts
 * @description 訂單取消審計 Handler
 *
 * 訂閱 OrderCancelled 事件，記錄訂單取消的審計日誌。
 *
 * Role: Application Layer - Event Handler
 */

import { AuditEntry, SYSTEM_USER_ID } from '../../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { OrderCancelled } from '../../Domain/Events/AuditLogEvents'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

export class OrderCancelledAuditHandler {
	constructor(
		private readonly repository: IAuditEntryRepository,
		private readonly logger: ILogger
	) {}

	async handle(event: OrderCancelled): Promise<void> {
		const { orderId, reason } = event.data

		this.logger.info(`[AuditLog] Recording OrderCancelled audit for order ${orderId}`)

		try {
			const entry = AuditEntry.create({
				userId: SYSTEM_USER_ID,
				entityType: 'Order',
				entityId: String(orderId),
				action: AuditAction.OrderCancelled,
				severity: AuditSeverity.WARNING,
				description: `Order cancelled: ${reason}`,
			})

			await this.repository.save(entry)

			this.logger.debug(`[AuditLog] OrderCancelled audit saved: ${entry.id}`)
		} catch (error) {
			this.logger.error(`[AuditLog] Failed to record OrderCancelled audit for order ${orderId}`, error)
			throw error
		}
	}
}
