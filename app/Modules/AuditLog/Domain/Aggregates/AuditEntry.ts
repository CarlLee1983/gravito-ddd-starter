/**
 * @file AuditEntry.ts
 * @description 審計日誌聚合根（Append-Only 不可變設計）
 *
 * 核心特性：
 * - 只有 static create() 工廠方法，無 update/delete
 * - 建立後所有欄位不可變
 * - 不繼承 AggregateRoot（純資料記錄，無事件溯源）
 *
 * Role: Domain Layer - Aggregate Root
 */

import type { AuditAction } from '../ValueObjects/AuditAction'
import type { AuditSeverity } from '../ValueObjects/AuditSeverity'

export interface AuditEntryProps {
	readonly id: string
	readonly userId: string
	readonly entityType: string
	readonly entityId: string
	readonly action: AuditAction
	readonly severity: AuditSeverity
	readonly description: string
	readonly createdAt: Date
}

/**
 * AuditEntry 聚合根
 *
 * Append-Only 設計：一旦建立就不可修改或刪除。
 */
/** 當事件不含使用者資訊時使用的系統級標識 */
export const SYSTEM_USER_ID = 'SYSTEM'

export class AuditEntry {
	readonly id: string
	readonly userId: string
	readonly entityType: string
	readonly entityId: string
	readonly action: AuditAction
	readonly severity: AuditSeverity
	readonly description: string
	readonly createdAt: Date

	private constructor(props: AuditEntryProps) {
		this.id = props.id
		this.userId = props.userId
		this.entityType = props.entityType
		this.entityId = props.entityId
		this.action = props.action
		this.severity = props.severity
		this.description = props.description
		this.createdAt = props.createdAt
	}

	/**
	 * 建立新的審計日誌條目
	 *
	 * @param props - 審計日誌屬性
	 * @returns 不可變的 AuditEntry 實例
	 */
	static create(props: Omit<AuditEntryProps, 'id' | 'createdAt'> & { id?: string; createdAt?: Date }): AuditEntry {
		return new AuditEntry({
			id: props.id ?? crypto.randomUUID(),
			userId: props.userId,
			entityType: props.entityType,
			entityId: props.entityId,
			action: props.action,
			severity: props.severity,
			description: props.description,
			createdAt: props.createdAt ?? new Date(),
		})
	}

	/**
	 * 從持久化資料重建 AuditEntry
	 *
	 * @param props - 完整的審計日誌屬性
	 * @returns AuditEntry 實例
	 */
	static reconstruct(props: AuditEntryProps): AuditEntry {
		return new AuditEntry(props)
	}

	/**
	 * 序列化為 JSON
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			userId: this.userId,
			entityType: this.entityType,
			entityId: this.entityId,
			action: this.action,
			severity: this.severity,
			description: this.description,
			createdAt: this.createdAt.toISOString(),
		}
	}
}
