/**
 * @file InventoryDeductedAuditHandler.ts
 * @description 庫存扣減審計 Handler
 *
 * 訂閱 InventoryDeducted 事件，記錄庫存扣減的審計日誌。
 *
 * Role: Application Layer - Event Handler
 */

import { AuditEntry, SYSTEM_USER_ID } from '../../Domain/Aggregates/AuditEntry'
import { AuditAction } from '../../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'
import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { InventoryDeducted } from '../../Domain/Events/AuditLogEvents'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

export class InventoryDeductedAuditHandler {
	constructor(
		private readonly repository: IAuditEntryRepository,
		private readonly logger: ILogger
	) {}

	async handle(event: InventoryDeducted): Promise<void> {
		const { sku, amount, orderId, inventoryId } = event

		this.logger.info(`[AuditLog] Recording InventoryDeducted audit for SKU ${sku}`)

		try {
			const entry = AuditEntry.create({
				userId: SYSTEM_USER_ID,
				entityType: 'Inventory',
				entityId: String(inventoryId),
				action: AuditAction.InventoryDeducted,
				severity: AuditSeverity.INFO,
				description: `Inventory deducted: ${amount} units of ${sku} for order ${orderId}`,
			})

			await this.repository.save(entry)

			this.logger.debug(`[AuditLog] InventoryDeducted audit saved: ${entry.id}`)
		} catch (error) {
			this.logger.error(`[AuditLog] Failed to record InventoryDeducted audit for SKU ${sku}`, error)
			throw error
		}
	}
}
