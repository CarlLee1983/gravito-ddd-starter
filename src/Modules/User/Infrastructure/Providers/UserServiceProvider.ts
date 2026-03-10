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
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { UserRepository } from '../Persistence/UserRepository'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'

export class UserServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 *
	 * @param container - 框架無關的容器介面
	 */
	override register(container: IContainer): void {
		// 1. 註冊 Repository (單例)
		container.singleton('userRepository', () => {
			return new UserRepository()
		})

		// 2. 註冊 Application Service / Handler（工廠）
		container.bind('createUserHandler', (c: IContainer) => {
			const repository = c.make('userRepository')
			return new CreateUserHandler(repository)
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 */
	override boot(_context: any): void {
		console.log('👤 [User] Module loaded')
	}
}
