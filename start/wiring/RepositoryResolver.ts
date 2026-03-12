/**
 * Repository 解析器
 *
 * @module RepositoryResolver
 * @description
 * 封裝 Repository 從 Registry 中解析和建立的邏輯。
 * 消除 ServiceProvider 中重複的 getRegistry、getCurrentORM、getDatabaseAccess 呼叫。
 *
 * **設計目的**
 * - 消除 DRY 違反：每個 Provider 中都有相同的三行重複邏輯
 * - 集中 ORM 選擇邏輯：所有 Repository 建立由此統一管理
 * - 為未來的宣告式註冊預留擴展點
 *
 * @internal Infrastructure Wiring
 */

import { getRegistry } from './RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'

/**
 * 從 Registry 中解析並建立指定型別的 Repository 實例
 *
 * 自動處理：
 * 1. Registry 查詢
 * 2. ORM 型別確認
 * 3. 條件性 DatabaseAccess 初始化（memory ORM 時為 undefined）
 *
 * @param type - Repository 型別（如 'user', 'post'）
 * @returns Repository 實例
 *
 * @example
 * ```typescript
 * // 在 ServiceProvider 中使用
 * container.singleton('userRepository', () => {
 *   return resolveRepository('user')
 * })
 * ```
 *
 * @throws 當 Registry 中不存在該型別的 Repository 工廠時
 */
export function resolveRepository(type: string): any {
	const registry = getRegistry()
	const orm = getCurrentORM()
	const db = orm !== 'memory' ? getDatabaseAccess() : undefined

	return registry.create(type, orm, db)
}

/**
 * 批量解析 Repository
 *
 * 用於需要多個 Repository 的模組。
 *
 * @param types - Repository 型別陣列
 * @returns 型別 → Repository 實例 的物件對應
 *
 * @example
 * ```typescript
 * const { user, post } = resolveRepositories(['user', 'post'])
 * ```
 */
export function resolveRepositories(types: string[]): Record<string, any> {
	return types.reduce(
		(acc, type) => {
			acc[type] = resolveRepository(type)
			return acc
		},
		{} as Record<string, any>
	)
}
