/**
 * Post 模組 Repository 工廠註冊
 *
 * 架構特點：
 * ✅ 模組對 ORM 實現完全無感知
 * ✅ Repository 映射由上層 bootstrap 層通過 FactoryMapBuilder 注入
 * ✅ 模組只負責註冊，不負責選擇實現
 * ✅ Memory 實現只在開發/測試環境被注入
 *
 * 使用流程：
 * 1. bootstrap.ts 中：const builder = new FactoryMapBuilder(orm, db)
 * 2. bootstrap.ts 中：registerPostRepositories(builder.build('post'))
 * 3. 此函數負責註冊到全局 Registry
 */

import type { RepositoryFactoryMap } from '@/wiring/RepositoryFactoryGenerator'
import { createRepositoryFactory } from '@/wiring/RepositoryFactoryGenerator'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 Post Repository 工廠到全局 Registry
 *
 * 注意：Repository 映射由上層注入，模組無需關心 ORM 選擇
 *
 * @param factoryMap 由 FactoryMapBuilder.build('post') 提供的工廠映射
 *
 * @example
 * // 在 bootstrap.ts 中
 * const builder = new FactoryMapBuilder('drizzle', db)
 * registerPostRepositories(builder.build('post'))
 */
export function registerPostRepositories(
	factoryMap: RepositoryFactoryMap
): void {
	const registry = getRegistry()

	// 使用 FactoryMapBuilder 提供的映射建立工廠
	const factory = createRepositoryFactory(factoryMap)

	registry.register('post', factory)
	console.log('✅ [Post] Repository 工廠已註冊')
}
