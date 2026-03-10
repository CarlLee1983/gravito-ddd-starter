/**
 * User Service Provider
 * 配置 User 模組的領域服務依賴
 *
 * 設計原則：
 * - 繼承框架無關的 ModuleServiceProvider
 * - 僅註冊 Domain/Application 層的依賴（Repository、Handler 等）
 * - Presentation 層的依賴（Controller）由 Wiring 層負責組裝
 * - ServiceProvider 專注於核心業務服務的生命週期管理
 * - 完全不依賴 @gravito/core（框架無關）
 *
 * ORM 抽換機制（已簡化）：
 * - Repository 由 RepositoryRegistry 提供
 * - 無需在此檔案中重複 ORM 選擇邏輯
 * - 單一責任：只負責依賴注入
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'

export class UserServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 *
	 * 流程：
	 * 1. 從 RepositoryRegistry 取得已註冊的 Repository 工廠
	 * 2. 創建 Repository 實例（ORM 選擇由 Registry 負責）
	 * 3. 註冊 Application Service（依賴 Repository）
	 *
	 * @param container - 框架無關的容器介面
	 */
	override register(container: IContainer): void {
		// 1. 從 Registry 取得 Repository（ORM 選擇已由 Registry 處理）
		container.singleton('userRepository', () => {
			const registry = getRegistry()
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('user', orm, db)
		})

		// 2. 註冊 Application Service / Handler（工廠）
		// 依賴於上面註冊的 userRepository
		container.bind('createUserHandler', (c: IContainer) => {
			const repository = c.make('userRepository')
			return new CreateUserHandler(repository)
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 */
	override boot(_context: any): void {
		const orm = getCurrentORM()
		console.log(`👤 [User] Module loaded (ORM: ${orm})`)
	}
}
