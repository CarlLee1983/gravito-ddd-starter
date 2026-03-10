/**
 * User Service Provider
 * 配置 User 模組的領域服務依賴
 *
 * 設計原則：
 * - 僅註冊 Domain/Application 層的依賴（Repository、Handler 等）
 * - Presentation 層的依賴（Controller）由 Wiring 層負責組裝
 * - ServiceProvider 專注於核心業務服務的生命週期管理
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { UserRepository } from '../Persistence/UserRepository'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'

export class UserServiceProvider extends ServiceProvider {
	/**
	 * register: 註冊所有依賴
	 */
	register(container: Container): void {
		// 1. 註冊 Repository (單例)
		container.singleton('userRepository', () => {
			return new UserRepository()
		})

		// 2. 註冊 Application Service / Handler (工廠)
		container.factory('createUserHandler', (c: Container) => {
			const repository = c.make('userRepository')
			return new CreateUserHandler(repository)
		})
	}

	/**
	 * boot: 啟動時執行初始化邏輯
	 */
	boot(_core: PlanetCore): void {
		console.log('👤 [User] Module loaded')
	}
}
