/**
 * @file PostServiceProvider.ts
 * @description 配置 Post 模組的領域服務與基礎設施依賴
 * @module src/Modules/Post/Infrastructure/Providers
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'

/**
 * PostServiceProvider 類別
 * 
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」。
 * 作為一個依賴提供者 (ServiceProvider)，負責向應用容器 (DI Container) 註冊 Post 模組所需的所有依賴項。
 */
export class PostServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊模組的所有領域與應用依賴
	 * 
	 * 從 RepositoryRegistry 中取得適當的 Repository 實例，並將其作為單例註冊。
	 * 
	 * @param container - DI 容器實例
	 * @returns void
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
	 * 啟動時執行模組初始化邏輯
	 * 
	 * @param _context - 啟動上下文 (目前未使用)
	 * @returns void
	 */
	override boot(_context: any): void {
		const orm = getCurrentORM()
		console.log(`✨ [Post] Module loaded (ORM: ${orm})`)
	}
}
