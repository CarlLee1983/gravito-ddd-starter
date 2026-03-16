import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('Database Projection (CQRS Optimization)', () => {
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    // 注入模擬資料
    await db.table('users').insert({
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret_hash', // 敏感資料
      internal_notes: 'should not be leaked'
    })
  })

  it('should only return specified columns when using select(columns)', async () => {
    const result = await db.table('users').select(['id', 'name', 'email'])
    
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: '1',
      name: 'Alice',
      email: 'alice@example.com'
    })
    
    // 確保敏感欄位未被選取
    expect(result[0]).not.toHaveProperty('password')
    expect(result[0]).not.toHaveProperty('internal_notes')
  })

  it('should only return specified columns when using first(columns)', async () => {
    const row = await db.table('users').where('id', '=', '1').first(['id', 'name'])
    
    expect(row).toEqual({
      id: '1',
      name: 'Alice'
    })
    
    expect(row).not.toHaveProperty('email')
    expect(row).not.toHaveProperty('password')
  })

  it('should return all columns if no columns are specified in select()', async () => {
    const result = await db.table('users').select()
    
    expect(result[0]).toHaveProperty('password')
    expect(result[0]).toHaveProperty('internal_notes')
    expect(result[0].name).toBe('Alice')
  })

  it('should handle non-existent columns gracefully by ignoring them', async () => {
    const result = await db.table('users').select(['id', 'non_existent_field'])
    
    expect(result[0]).toEqual({ id: '1' })
    expect(result[0]).not.toHaveProperty('non_existent_field')
  })
})
