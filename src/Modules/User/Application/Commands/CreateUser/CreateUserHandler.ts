/**
 * Create User Handler
 */

import { User } from '../../../Domain/Aggregates/User'
import type { IUserRepository } from '../../../Domain/Repositories/IUserRepository'
import type { CreateUserCommand } from './CreateUserCommand'
import type { UserDTO } from '../../DTOs/UserDTO'

export class CreateUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(command: CreateUserCommand): Promise<UserDTO> {
    const existingUser = await this.userRepository.findByEmail(command.email)
    if (existingUser) {
      throw new Error('User already exists')
    }

    const id = crypto.randomUUID()
    const user = User.create(id, command.name, command.email)
    await this.userRepository.save(user)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
