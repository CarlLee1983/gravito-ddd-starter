/**
 * @file PostServiceProvider.ts
 * @description 配置 Post 模組的領域服務與基礎設施依賴
 * @module src/Modules/Post/Infrastructure/Providers
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'
import { UserCreatedHandler } from '../../Application/Handlers/UserCreatedHandler'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'

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

		// 註冊事件處理器
		container.singleton('userCreatedHandler', () => new UserCreatedHandler())
	}

	/**
	 * 啟動時執行模組初始化邏輯與事件訂閱
	 * 
	 * @param core - 啟動上下文 (Gravito 核心實例)
	 * @returns void
	 */
	override boot(core: any): void {
		const orm = getCurrentORM()
		console.log(`✨ [Post] Module loaded (ORM: ${orm})`)

		// ✨ 訂閱 User 模組發出的事件 (達成跨模組非同步通訊)
		try {
			const dispatcher = core.container.make('eventDispatcher') as IEventDispatcher
			const handler = core.container.make('userCreatedHandler') as UserCreatedHandler

			dispatcher.subscribe('UserCreated', (event) => handler.handle(event))
			console.log('🔗 [Post] Subscribed to UserCreated events')
		} catch (error) {
			console.warn('⚠️ [Post] Could not subscribe to UserCreated events: eventDispatcher not found')
		}
	}
}
