/**
 * @file AuditSeverity.ts
 * @description 審計嚴重性列舉值物件
 *
 * Role: Domain Layer - Value Object (ENUM)
 */

export const AuditSeverity = {
	/** 正常操作 */
	INFO: 'INFO',
	/** 異常但無損 */
	WARNING: 'WARNING',
	/** 故障 */
	ERROR: 'ERROR',
} as const

export type AuditSeverity = (typeof AuditSeverity)[keyof typeof AuditSeverity]
