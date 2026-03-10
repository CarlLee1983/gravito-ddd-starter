/**
 * User Repository Interface
 */

import type { User } from '../Aggregates/User'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<void>
  list(): Promise<User[]>
}
