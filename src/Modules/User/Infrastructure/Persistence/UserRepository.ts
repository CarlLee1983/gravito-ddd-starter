/**
 * In-memory User Repository
 */

import { User } from '../../Domain/Aggregates/User'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

export class UserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user)
  }

  async list(): Promise<User[]> {
    return Array.from(this.users.values())
  }
}
