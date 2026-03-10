/**
 * PostServiceProvider
 * 配置 Post 模組的領域服務依賴
 *
 * 設計原則：
 * - 繼承框架無關的 ModuleServiceProvider
 * - 不依賴 @gravito/core（框架解耦）
 * - 只負責註冊領域和應用層依賴
 * - Presentation 層的依賴由 Wiring 層組裝
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PostRepository } from '../Repositories/PostRepository'

export class PostServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 */
	override register(container: IContainer): void {
		// 註冊 Repository (單例)
		container.singleton('PostRepository', () => {
			return new PostRepository()
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 */
	override boot(_context: any): void {
		console.log('✨ [Post] Module loaded')
	}
}
