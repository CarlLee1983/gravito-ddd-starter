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
 * ORM 抽換機制：
 * - 使用 RepositoryFactory 進行 ORM 選擇
 * - 根據環境變數 (ORM) 自動選擇實現
 * - 支援 memory、drizzle、atlas、prisma
 * - **不需要為每個 ORM 建立不同的 ServiceProvider**
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createRepository, getDatabaseAccess, getCurrentORM } from '@/wiring/RepositoryFactory'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'

export class UserServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 *
	 * 流程：
	 * 1. 讀取當前 ORM 選擇
	 * 2. 若需要 Database，初始化 DatabaseAccess
	 * 3. 使用 RepositoryFactory 創建合適的 Repository 實現
	 * 4. 註冊 Application Service（依賴 Repository）
	 *
	 * @param container - 框架無關的容器介面
	 */
	override register(container: IContainer): void {
		// 1. 決定 ORM 並註冊 Repository (單例)
		container.singleton('userRepository', () => {
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return createRepository('user', db)
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
