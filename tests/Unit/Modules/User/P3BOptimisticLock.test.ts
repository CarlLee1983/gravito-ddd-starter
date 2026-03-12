/**
 * @file P3BOptimisticLock.test.ts
 * @description User Repository 樂觀鎖測試 (P3B)
 *
 * 驗證版本衝突保護機制
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { OptimisticLockException } from '@/Shared/Application/OptimisticLockException'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('User Repository - Optimistic Lock (P3B)', () => {
  let repository: UserRepository
  let db: MemoryDatabaseAccess

  beforeEach(() => {
    db = new MemoryDatabaseAccess()
    repository = new UserRepository(db)
  })

  describe('version field initialization', () => {
    it('新建用戶應初始化版本為 0', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))
      await repository.save(user)

      const row = await db.table('users').where('id', '=', 'user-1').first()
      expect(row?.version).toBe(0)
    })
  })

  describe('version increment on update', () => {
    beforeEach(async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))
      await repository.save(user)
    })

    it('更新後版本應遞增', async () => {
      let user = await repository.findById('user-1')
      expect(user).not.toBeNull()

      if (user) {
        user.changeName(UserName.create('Bob'))
        await repository.save(user)
      }

      const row = await db.table('users').where('id', '=', 'user-1').first()
      expect(row?.version).toBe(1)
    })

    it('多次更新應持續遞增版本', async () => {
      // 第 1 次更新
      let user = await repository.findById('user-1')
      if (user) {
        user.changeName(UserName.create('Bob'))
        await repository.save(user)
      }

      let row = await db.table('users').where('id', '=', 'user-1').first()
      expect(row?.version).toBe(1)

      // 第 2 次更新
      user = await repository.findById('user-1')
      if (user) {
        user.changeName(UserName.create('Charlie'))
        await repository.save(user)
      }

      row = await db.table('users').where('id', '=', 'user-1').first()
      expect(row?.version).toBe(2)
    })
  })

  describe('OptimisticLockException', () => {
    it('應可以正常創建異常', () => {
      const error = new OptimisticLockException('User', 'user-1', 5)

      expect(error).toBeInstanceOf(OptimisticLockException)
      expect(error.name).toBe('OptimisticLockException')
      expect(error.aggregateType).toBe('User')
      expect(error.aggregateId).toBe('user-1')
      expect(error.expectedVersion).toBe(5)
      expect(error.message).toContain('版本衝突')
    })

    it('異常訊息應包含重要資訊', () => {
      const error = new OptimisticLockException('User', 'my-user', 3)

      expect(error.message).toContain('my-user')
      expect(error.message).toContain('3')
    })
  })
})
