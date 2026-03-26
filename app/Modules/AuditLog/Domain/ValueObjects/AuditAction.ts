/**
 * @file AuditAction.ts
 * @description 審計動作列舉值物件
 *
 * Role: Domain Layer - Value Object (ENUM)
 */

export const AuditAction = {
	OrderCreated: 'OrderCreated',
	OrderCancelled: 'OrderCancelled',
	PaymentSucceeded: 'PaymentSucceeded',
	PaymentFailed: 'PaymentFailed',
	InventoryDeducted: 'InventoryDeducted',
} as const

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]
