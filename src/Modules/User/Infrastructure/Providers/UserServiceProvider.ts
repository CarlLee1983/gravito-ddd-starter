/**
 * User Service Provider
 * 配置 User 模組的所有依賴到容器
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { UserRepository } from '../Persistence/UserRepository'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'
import { UserController } from '../../Presentation/Controllers/UserController'

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

    // 3. 註冊 Controller (工廠)
    // 每次請求時都會創建新的 controller 實例，但 dependency 是單例的
    container.factory('userController', (c: Container) => {
      const repository = c.make('userRepository')
      const createUserHandler = c.make('createUserHandler')
      return new UserController(repository, createUserHandler)
    })
  }

  /**
   * boot: 啟動時執行初始化邏輯
   */
  boot(_core: PlanetCore): void {
    console.log('👤 [User] Module loaded')
  }
}
