/**
 * @file IAuditEntryRepository.ts
 * @description 審計日誌 Repository 介面
 *
 * Append-Only 設計：只有 save 和查詢方法，無 update/delete。
 *
 * Role: Domain Layer - Repository Port (A1)
 */

import type { AuditEntry } from '../Aggregates/AuditEntry'
import type { AuditSeverity } from '../ValueObjects/AuditSeverity'

export interface IAuditEntryRepository {
	/**
	 * 儲存審計日誌條目（僅新增）
	 */
	save(entry: AuditEntry): Promise<void>

	/**
	 * 依實體類型和 ID 查詢審計日誌
	 */
	findByEntityId(entityType: string, entityId: string): Promise<AuditEntry[]>

	/**
	 * 依嚴重性查詢審計日誌（可選時間範圍）
	 */
	findBySeverity(severity: AuditSeverity, from?: Date, to?: Date): Promise<AuditEntry[]>

	/**
	 * 匯出指定時間範圍內的審計日誌
	 */
	exportRange(from: Date, to: Date): Promise<AuditEntry[]>
}
