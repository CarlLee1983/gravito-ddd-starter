/**
 * @file registerAuditLogRepositories.ts
 * @description AuditLog 模組 Repository 註冊
 *
 * Role: Infrastructure Layer - Repository Registration
 */

import { MemoryAuditEntryRepository } from '../Repositories/MemoryAuditEntryRepository'

/**
 * 註冊 AuditLog Repository
 *
 * @param container - DI 容器
 */
export function registerAuditLogRepositories(
	container: { singleton(name: string, factory: (c: any) => any): void }
): void {
	container.singleton('auditEntryRepository', () => {
		return new MemoryAuditEntryRepository()
	})
}
