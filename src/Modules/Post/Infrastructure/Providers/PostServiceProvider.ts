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
 * ORM 抽換機制（已簡化）：
 * - Repository 由 RepositoryRegistry 提供
 * - 與 UserServiceProvider 完全相同的模式
 * - 無需重複 ORM 選擇邏輯
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'

export class PostServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 *
	 * 與 User 模組完全相同的流程，只改變 Repository 類型
	 */
	override register(container: IContainer): void {
		// 從 Registry 取得 Repository
		container.singleton('postRepository', () => {
			const registry = getRegistry()
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('post', orm, db)
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
