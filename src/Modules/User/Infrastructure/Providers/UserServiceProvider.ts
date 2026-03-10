/**
 * User Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { UserRepository } from '../Persistence/UserRepository'
import { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'

export class UserServiceProvider extends ServiceProvider {
  register(container: Container): void {
    const userRepository = new UserRepository()
    container.singleton('userRepository', () => userRepository)
    container.singleton('createUserHandler', () => new CreateUserHandler(userRepository))
  }

  boot(_core: PlanetCore): void {
    console.log('👤 [User] Module loaded')
  }
}
