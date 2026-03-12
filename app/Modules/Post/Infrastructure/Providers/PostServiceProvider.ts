/**
 * @file PostServiceProvider.ts
 * @description 配置 Post 模組的領域服務與基礎設施依賴
 * @module src/Modules/Post/Infrastructure/Providers
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { resolveRepository } from '@/wiring/RepositoryResolver'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { WelcomePostAutomation } from '../../Application/Handlers/WelcomePostAutomation'
import { CreatePostService } from '../../Application/Services/CreatePostService'
import { GetPostService } from '../../Application/Services/GetPostService'
import { UserToPostAdapter } from '../Adapters/UserToPostAdapter'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'
import type { ILogger } from '@/Shared/Infrastructure/ILogger'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

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
		// 從 Registry 取得 Repository（ORM 選擇由 RepositoryResolver 統一處理）
		container.singleton('postRepository', () => resolveRepository('post'))

		// 註冊防腐層適配器：User → Post（IAuthorService 實現）
		container.singleton('authorService', (c) => {
			const userRepository = c.make('userRepository') as IUserRepository
			return new UserToPostAdapter(userRepository)
		})

		// 註冊應用層寫入服務
		container.singleton('createPostService', (c) => {
			return new CreatePostService(
				c.make('postRepository'),
				c.make('authorService')
			)
		})

		// 註冊應用層讀取服務（CQRS 讀側）
		container.singleton('getPostService', (c) => {
			return new GetPostService(
				c.make('postRepository'),
				c.make('authorService')
			)
		})

		// 註冊新用戶歡迎文章自動化流程（需要依賴注入）
		container.singleton('welcomePostAutomation', (c) => {
			return new WelcomePostAutomation(
				c.make('createPostService') as CreatePostService,
				c.make('logger') as ILogger
			)
		})
	}

	/**
	 * 啟動時執行模組初始化邏輯與事件訂閱
	 * 
	 * @param core - 啟動上下文 (Gravito 核心實例)
	 * @returns void
	 */
	override boot(core: any): void {
		// 開發環境輸出 ORM 信息用於調試
		if (process.env.NODE_ENV === 'development') {
			const orm = getCurrentORM()
			console.log(`✨ [Post] Module loaded (ORM: ${orm})`)
		}

		// ✨ 訂閱 User 模組發出的事件，自動發布歡迎文章 (達成跨模組非同步通訊)
		try {
			const dispatcher = core.container.make('eventDispatcher') as IEventDispatcher
			const automation = core.container.make('welcomePostAutomation') as WelcomePostAutomation

			dispatcher.subscribe('UserCreated', (event) => automation.handle(event))
			console.log('🔗 [Post] Subscribed to UserCreated events for welcome post automation')
		} catch (error) {
			console.warn('⚠️ [Post] Could not subscribe to UserCreated events: eventDispatcher not found')
		}
	}
}
