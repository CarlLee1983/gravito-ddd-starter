/**
 * @file MemoryAuditEntryRepository.ts
 * @description 審計日誌 Memory Repository 實現
 *
 * Append-Only 設計：只有 save 和查詢方法，無 update/delete。
 *
 * Role: Infrastructure Layer - Repository Implementation
 */

import type { IAuditEntryRepository } from '../../Domain/Repositories/IAuditEntryRepository'
import type { AuditEntry } from '../../Domain/Aggregates/AuditEntry'
import type { AuditSeverity } from '../../Domain/ValueObjects/AuditSeverity'

export class MemoryAuditEntryRepository implements IAuditEntryRepository {
	private readonly entries: Map<string, AuditEntry> = new Map()

	async save(entry: AuditEntry): Promise<void> {
		this.entries.set(entry.id, entry)
	}

	async findByEntityId(entityType: string, entityId: string): Promise<AuditEntry[]> {
		return Array.from(this.entries.values()).filter(
			(e) => e.entityType === entityType && e.entityId === entityId
		)
	}

	async findBySeverity(severity: AuditSeverity, from?: Date, to?: Date): Promise<AuditEntry[]> {
		return Array.from(this.entries.values()).filter((e) => {
			if (e.severity !== severity) return false
			if (from && e.createdAt < from) return false
			if (to && e.createdAt > to) return false
			return true
		})
	}

	async exportRange(from: Date, to: Date): Promise<AuditEntry[]> {
		return Array.from(this.entries.values())
			.filter((e) => e.createdAt >= from && e.createdAt <= to)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
	}

	/**
	 * 取得所有條目（測試用途）
	 */
	getAll(): AuditEntry[] {
		return Array.from(this.entries.values())
	}

	/**
	 * 清除所有條目（測試用途）
	 */
	clear(): void {
		this.entries.clear()
	}
}
