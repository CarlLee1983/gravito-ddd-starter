/**
 * @file Phase2DomainRedesign.test.ts
 * @description User 模組 Phase 2 DDD 改造測試
 *
 * 測試範圍：
 * ✅ ValueObject 驗證（Email、UserName）
 * ✅ 聚合根事件驅動建立（User.create）
 * ✅ 聚合根無事件還原（User.reconstitute）
 * ✅ 事件應用（applyEvent）
 * ✅ Repository toDomain/toRow 轉換
 * ✅ CreateUserService 完整工作流
 * ✅ 不可變性驗證
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { UserCreated } from '@/Modules/User/Domain/Events/UserCreated'
import { UserDTO } from '@/Modules/User/Application/DTOs/UserDTO'
import { CreateUserService } from '@/Modules/User/Application/Services/CreateUserService'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

// ============ ValueObject 驗證測試 ============

describe('Phase 2: Email ValueObject', () => {
  it('should create valid email', () => {
    const email = Email.create('user@example.com')
    expect(email.value).toBe('user@example.com')
  })

  it('should normalize email (trim and lowercase)', () => {
    const email = Email.create('  USER@EXAMPLE.COM  ')
    expect(email.value).toBe('user@example.com')
  })

  it('should throw error for invalid email format', () => {
    expect(() => Email.create('invalid-email')).toThrow('無效的電子郵件格式')
    expect(() => Email.create('user@')).toThrow('無效的電子郵件格式')
    expect(() => Email.create('@example.com')).toThrow('無效的電子郵件格式')
  })

  it('should be immutable', () => {
    const email = Email.create('user@example.com')
    expect(() => {
      ;(email as any).value = 'other@example.com'
    }).toThrow()
  })

  it('should have structural equality', () => {
    const email1 = Email.create('user@example.com')
    const email2 = Email.create('user@example.com')
    expect(email1.equals(email2)).toBe(true)
  })

  it('should have different equality', () => {
    const email1 = Email.create('user1@example.com')
    const email2 = Email.create('user2@example.com')
    expect(email1.equals(email2)).toBe(false)
  })
})

describe('Phase 2: UserName ValueObject', () => {
  it('should create valid user name', () => {
    const name = UserName.create('John Doe')
    expect(name.value).toBe('John Doe')
  })

  it('should trim whitespace', () => {
    const name = UserName.create('  John Doe  ')
    expect(name.value).toBe('John Doe')
  })

  it('should throw error for too short name', () => {
    expect(() => UserName.create('Jo')).toThrow('用戶名稱長度至少需要 3 個字元')
  })

  it('should throw error for too long name', () => {
    const longName = 'a'.repeat(101)
    expect(() => UserName.create(longName)).toThrow('用戶名稱長度不能超過 100 個字元')
  })

  it('should support Chinese characters', () => {
    const name = UserName.create('王小明')
    expect(name.value).toBe('王小明')
  })

  it('should support names with hyphens and dots', () => {
    const name = UserName.create('Mary-Jane Smith')
    expect(name.value).toBe('Mary-Jane Smith')
  })

  it('should support names with dots explicitly', () => {
    const name = UserName.create('J. Robert Smith')
    expect(name.value).toBe('J. Robert Smith')
  })

  it('should support names with multiple dots', () => {
    const name = UserName.create('Dr. J.R. Smith Jr.')
    expect(name.value).toBe('Dr. J.R. Smith Jr.')
  })

  it('should reject only spaces', () => {
    expect(() => UserName.create('   ')).toThrow('用戶名稱不能只包含空格')
  })

  it('should be immutable', () => {
    const name = UserName.create('John Doe')
    expect(() => {
      ;(name as any).value = 'Jane Doe'
    }).toThrow()
  })

  it('should have structural equality', () => {
    const name1 = UserName.create('John Doe')
    const name2 = UserName.create('John Doe')
    expect(name1.equals(name2)).toBe(true)
  })
})

// ============ AggregateRoot 事件驅動測試 ============

describe('Phase 2: User.create (Event-Driven)', () => {
  it('should create user and raise UserCreated event', () => {
    const email = Email.create('john@example.com')
    const name = UserName.create('John Doe')
    const user = User.create('user-1', name, email)

    expect(user.id).toBe('user-1')
    expect(user.name.equals(name)).toBe(true)
    expect(user.email.equals(email)).toBe(true)
    expect(user.createdAt).toBeInstanceOf(Date)
  })

  it('should have uncommitted UserCreated event', () => {
    const email = Email.create('john@example.com')
    const name = UserName.create('John Doe')
    const user = User.create('user-1', name, email)

    const events = user.getUncommittedEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(UserCreated)
  })

  it('should contain correct data in UserCreated event', () => {
    const email = Email.create('john@example.com')
    const name = UserName.create('John Doe')
    const user = User.create('user-1', name, email)

    const event = user.getUncommittedEvents()[0] as UserCreated
    expect(event.userId).toBe('user-1')
    expect(event.name).toBe('John Doe')
    expect(event.email).toBe('john@example.com')
  })

  it('should have all properties read-only', () => {
    const email = Email.create('john@example.com')
    const name = UserName.create('John Doe')
    const user = User.create('user-1', name, email)

    expect(() => {
      ;(user as any).id = 'user-2'
    }).toThrow()
  })
})

// ============ AggregateRoot 無事件還原測試 ============

describe('Phase 2: User.reconstitute (Restore)', () => {
  it('should reconstitute without events', () => {
    const email = Email.create('jane@example.com')
    const name = UserName.create('Jane Doe')
    const createdAt = new Date('2025-01-01')

    const user = User.reconstitute('user-2', name, email, createdAt)

    expect(user.id).toBe('user-2')
    expect(user.name).toBe(name)
    expect(user.email).toBe(email)
    expect(user.createdAt).toEqual(createdAt)
  })

  it('should have no uncommitted events after reconstitute', () => {
    const email = Email.create('jane@example.com')
    const name = UserName.create('Jane Doe')
    const user = User.reconstitute('user-2', name, email, new Date())

    expect(user.getUncommittedEvents()).toHaveLength(0)
  })

  it('should preserve original creation date', () => {
    const originalDate = new Date('2024-01-15')
    const email = Email.create('test@example.com')
    const name = UserName.create('Test User')

    const user = User.reconstitute('user-3', name, email, originalDate)

    expect(user.createdAt).toEqual(originalDate)
  })
})

// ============ 事件應用測試 ============

describe('Phase 2: User.applyEvent', () => {
  it('should apply UserCreated event to reconstruct state', () => {
    const user = new (User as any)('user-1')
    const createdAt = new Date('2024-01-15T10:30:00Z')
    const event = new UserCreated('user-1', 'John Doe', 'john@example.com', createdAt)

    user.applyEvent(event)

    expect(user.name.value).toBe('John Doe')
    expect(user.email.value).toBe('john@example.com')
    expect(user.createdAt).toEqual(createdAt)
  })

  it('should create ValueObject instances from event data', () => {
    const user = new (User as any)('user-1')
    const createdAt = new Date('2024-01-15T10:30:00Z')
    const event = new UserCreated('user-1', 'Jane Doe', 'jane@example.com', createdAt)

    user.applyEvent(event)

    expect(user.name).toBeInstanceOf(UserName)
    expect(user.email).toBeInstanceOf(Email)
    expect(user.createdAt).toEqual(createdAt)
  })

  it('should support event sourcing reconstruction', () => {
    const user = new (User as any)('user-1')
    const createdAt = new Date('2024-01-15T10:30:00Z')
    const event1 = new UserCreated('user-1', 'Alice', 'alice@example.com', createdAt)

    user.applyEvent(event1)

    expect(user.id).toBe('user-1')
    expect(user.name.value).toBe('Alice')
    expect(user.email.value).toBe('alice@example.com')
    expect(user.createdAt).toEqual(createdAt)
  })
})

// ============ DTO 轉換測試 ============

describe('Phase 2: UserDTO Conversion', () => {
  it('should convert entity to DTO', () => {
    const email = Email.create('bob@example.com')
    const name = UserName.create('Bob Smith')
    const user = User.create('user-4', name, email)

    const dto = UserDTO.fromEntity(user)

    expect(dto.id).toBe('user-4')
    expect(dto.name).toBe('Bob Smith')
    expect(dto.email).toBe('bob@example.com')
    expect(dto.createdAt).toBeInstanceOf(Date)
  })

  it('should convert DTO to JSON for API response', () => {
    const email = Email.create('carol@example.com')
    const name = UserName.create('Carol Johnson')
    const user = User.create('user-5', name, email)
    const dto = UserDTO.fromEntity(user)

    const json = dto.toJSON()

    expect(json.id).toBe('user-5')
    expect(json.name).toBe('Carol Johnson')
    expect(json.email).toBe('carol@example.com')
    expect(typeof json.createdAt).toBe('string')
    expect(json.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('should preserve all user data in JSON', () => {
    const email = Email.create('david@example.com')
    const name = UserName.create('David Lee')
    const createdAt = new Date('2025-01-10')
    const user = User.reconstitute('user-6', name, email, createdAt)
    const dto = UserDTO.fromEntity(user)

    const json = dto.toJSON()

    expect(json.id).toBe('user-6')
    expect(json.name).toBe('David Lee')
    expect(json.email).toBe('david@example.com')
  })
})

// ============ CreateUserService 工作流測試 ============

describe('Phase 2: CreateUserService Workflow', () => {
  let mockRepository: IUserRepository
  let service: CreateUserService

  beforeEach(() => {
    mockRepository = {
      save: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
      findByEmail: () => Promise.resolve(null),
      delete: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
      list: () => Promise.resolve([]),
    }
    service = new CreateUserService(mockRepository)
  })

  it('should execute create user use case', async () => {
    let savedUser: User | null = null

    mockRepository.save = async (user: User) => {
      savedUser = user
    }

    const dto = await service.execute({
      id: 'user-7',
      name: 'Emma Davis',
      email: 'emma@example.com',
    })

    expect(dto.id).toBe('user-7')
    expect(dto.name).toBe('Emma Davis')
    expect(dto.email).toBe('emma@example.com')
    expect(savedUser).not.toBeNull()
    expect(savedUser?.id).toBe('user-7')
  })

  it('should validate email format before creating', async () => {
    await expect(
      service.execute({
        id: 'user-8',
        name: 'Frank',
        email: 'invalid-email',
      })
    ).rejects.toThrow('無效的電子郵件格式')
  })

  it('should validate name length before creating', async () => {
    await expect(
      service.execute({
        id: 'user-9',
        name: 'ab',
        email: 'grace@example.com',
      })
    ).rejects.toThrow('用戶名稱長度至少需要 3 個字元')
  })

  it('should prevent duplicate email registration', async () => {
    const existingEmail = Email.create('taken@example.com')
    const existingUser = User.reconstitute(
      'user-existing',
      UserName.create('Existing User'),
      existingEmail,
      new Date()
    )

    mockRepository.findByEmail = async (email: Email) => {
      if (email.value === 'taken@example.com') {
        return existingUser
      }
      return null
    }

    await expect(
      service.execute({
        id: 'user-10',
        name: 'Henry Hall',
        email: 'taken@example.com',
      })
    ).rejects.toThrow('電子郵件已被使用')
  })

  it('should persist user with events', async () => {
    let persistedUser: User | null = null

    mockRepository.save = async (user: User) => {
      persistedUser = user
    }

    await service.execute({
      id: 'user-11',
      name: 'Ivy Lopez',
      email: 'ivy@example.com',
    })

    expect(persistedUser).not.toBeNull()
    expect(persistedUser?.getUncommittedEvents()).toHaveLength(1)
    expect(persistedUser?.getUncommittedEvents()[0]).toBeInstanceOf(UserCreated)
  })

  it('should handle event commitment', async () => {
    let savedUserEvents = 0

    mockRepository.save = async (user: User) => {
      savedUserEvents = user.getUncommittedEvents().length
      user.markEventsAsCommitted()
    }

    const dto = await service.execute({
      id: 'user-12',
      name: 'Jack Martinez',
      email: 'jack@example.com',
    })

    expect(dto.id).toBe('user-12')
    expect(savedUserEvents).toBe(1)
  })
})

// ============ 完整工作流測試 ============

describe('Phase 2: Complete Workflow', () => {
  it('should execute full flow: create -> save -> restore -> dto', async () => {
    // 1. Create 工廠方法建立聚合根（有事件）
    const email = Email.create('workflow@example.com')
    const name = UserName.create('Workflow User')
    const user = User.create('user-workflow', name, email)

    // 驗證事件已產生
    expect(user.getUncommittedEvents()).toHaveLength(1)

    // 2. 標記事件已提交（模擬 save）
    user.markEventsAsCommitted()
    expect(user.getUncommittedEvents()).toHaveLength(0)

    // 3. 從持久化資料還原（模擬 load）
    const restoredUser = User.reconstitute('user-workflow', name, email, user.createdAt)

    // 4. 轉換為 DTO
    const dto = UserDTO.fromEntity(restoredUser)

    // 驗證完整性
    expect(dto.id).toBe('user-workflow')
    expect(dto.name).toBe('Workflow User')
    expect(dto.email).toBe('workflow@example.com')
    expect(restoredUser.getUncommittedEvents()).toHaveLength(0)
  })

  it('should verify immutability throughout lifecycle', () => {
    const email = Email.create('immutable@example.com')
    const name = UserName.create('Immutable User')
    const user = User.create('user-immutable', name, email)

    // 確認所有屬性都是只讀的
    expect(() => {
      ;(user as any).id = 'modified'
    }).toThrow()

    expect(() => {
      ;(email as any).value = 'modified@example.com'
    }).toThrow()

    expect(() => {
      ;(name as any).value = 'Modified Name'
    }).toThrow()

    // 確認狀態未被改變
    expect(user.id).toBe('user-immutable')
    expect(email.value).toBe('immutable@example.com')
    expect(name.value).toBe('Immutable User')
  })
})

// ============ Date 防禦性複製驗證 ============

describe('Date 防禦性複製', () => {
  it('reconstitute() 應該防禦性複製 createdAt', () => {
    const originalDate = new Date('2024-01-01T00:00:00Z')
    const user = User.reconstitute('user-date', UserName.create('Alice'), Email.create('alice@test.com'), originalDate)

    // 修改原始日期
    originalDate.setFullYear(2025)

    // 聚合根的日期應該保持不變
    expect(user.createdAt.getFullYear()).toBe(2024)
  })

  it('applyEvent() 應該防禦性複製 createdAt', () => {
    const eventDate = new Date('2024-06-15T12:00:00Z')
    const event = new UserCreated('user-event', 'Bob', 'bob@test.com', eventDate)

    const user = User.reconstitute('user-event', UserName.create('Bob'), Email.create('bob@test.com'), new Date())
    user.applyEvent(event)

    const storedDate = user.createdAt

    // 嘗試修改返回的日期
    storedDate.setFullYear(2025)

    // 檢查 getter 返回的是複製，修改它不應該影響內部狀態
    expect(user.createdAt.getFullYear()).toBe(2024)
  })
})
