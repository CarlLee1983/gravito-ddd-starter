import { describe, it, expect } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/MemoryDatabaseAccess'
import { UserRepository } from '../Infrastructure/Persistence/UserRepository'
import { User } from '../Domain/Aggregates/User'

describe('UserRepository Unit', () => {
  it('should save and find a user', async () => {
    const repository = new UserRepository(new MemoryDatabaseAccess())
    const user = User.create('1', 'Test', 'test@example.com')
    
    await repository.save(user)
    const found = await repository.findById('1')
    
    expect(found).toBeDefined()
    expect(found?.name).toBe('Test')
    expect(found?.email).toBe('test@example.com')
  })

  it('should find a user by email', async () => {
    const repository = new UserRepository(new MemoryDatabaseAccess())
    const user = User.create('1', 'Test', 'test@example.com')
    
    await repository.save(user)
    const found = await repository.findByEmail('test@example.com')
    
    expect(found).toBeDefined()
    expect(found?.id).toBe('1')
  })

  it('should return null for non-existent user', async () => {
    const repository = new UserRepository(new MemoryDatabaseAccess())
    const found = await repository.findById('999')
    expect(found).toBeNull()
  })
})
