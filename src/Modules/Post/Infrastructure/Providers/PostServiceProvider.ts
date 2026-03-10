/**
 * PostServiceProvider
 * 配置 Post 模組的領域服務依賴
 *
 * 設計原則：
 * - 繼承框架無關的 ModuleServiceProvider
 * - 不依賴 @gravito/core（框架解耦）
 * - 只負責註冊領域和應用層依賴
 * - Presentation 層的依賴由 Wiring 層組裝
 *
 * ORM 抽換機制：
 * - 與 UserServiceProvider 完全相同的模式
 * - 使用統一的 RepositoryFactory
 * - 無需重複代碼，只需改變 Repository 類型參數
 *
 * 範例對比：
 * // UserServiceProvider
 * createRepository('user', db)
 *
 * // PostServiceProvider
 * createRepository('post', db)
 *
 * 其餘邏輯完全相同，充分體現可重用性和統一性
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createRepository, getDatabaseAccess, getCurrentORM } from '@/wiring/RepositoryFactory'

export class PostServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 *
	 * 與 User 模組相同的流程，只改變 Repository 類型
	 */
	override register(container: IContainer): void {
		// 註冊 Repository (單例)
		container.singleton('postRepository', () => {
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return createRepository('post', db)
		})

		// TODO: 如需 Application Service 時，在此註冊
		// container.bind('createPostHandler', (c: IContainer) => {
		//   const repository = c.make('postRepository')
		//   return new CreatePostHandler(repository)
		// })
	}

	/**
	 * 啟動時執行初始化邏輯
	 */
	override boot(_context: any): void {
		const orm = getCurrentORM()
		console.log(`✨ [Post] Module loaded (ORM: ${orm})`)
	}
}
