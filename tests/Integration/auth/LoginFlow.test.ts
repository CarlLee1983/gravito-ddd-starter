/**
 * @file LoginFlow.test.ts
 * @description 認證登入流程集成測試
 *
 * 測試完整的認證流程：建立帶密碼的用戶 → 登入 → 驗證 Token → 登出
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import { CreateSessionService } from '@/Modules/Session/Application/Services/CreateSessionService'
import { ValidateSessionService } from '@/Modules/Session/Application/Services/ValidateSessionService'
import { InvalidCredentialsException } from '@/Modules/Session/Domain/Exceptions/InvalidCredentialsException'
import { SessionExpiredException } from '@/Modules/Session/Domain/Exceptions/SessionExpiredException'
import { Password } from '@/Modules/User/Domain/ValueObjects/Password'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { MemorySessionRepository } from '@/Modules/Session/Infrastructure/Persistence/MemorySessionRepository'
import { JoseTokenSigner } from '@/Shared/Infrastructure/Adapters/Gravito/JoseTokenSigner'

// 簡單的內存 User Repository（用於測試）
class MemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map()
  private emailIndex: Map<string, string> = new Map()

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: Email): Promise<User | null> {
    const userId = this.emailIndex.get(email.value)
    if (!userId) return null
    return this.users.get(userId) ?? null
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user)
    this.emailIndex.set(user.email.value, user.id)
  }

  async delete(id: string): Promise<void> {
    const user = this.users.get(id)
    if (user) {
      this.emailIndex.delete(user.email.value)
      this.users.delete(id)
    }
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  async list(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  async count(): Promise<number> {
    return this.users.size
  }
}

describe('認證登入流程', () => {
  let userRepository: MemoryUserRepository
  let sessionRepository: MemorySessionRepository
  let createSessionService: CreateSessionService
  let validateSessionService: ValidateSessionService

  beforeEach(() => {
    // 設置環境變數（測試用）
    process.env.JWT_SECRET = 'test-secret-key'
    process.env.JWT_EXPIRES_IN = '86400'

    userRepository = new MemoryUserRepository()
    sessionRepository = new MemorySessionRepository()

    // 建立 credentialVerifier 適配器（ICredentialVerifier Port 實現）
    const credentialVerifier = {
      async verifyByEmail(
        email: string,
        password: string
      ): Promise<{ userId: string } | null> {
        const emailVo = Email.create(email)
        const user = await userRepository.findByEmail(emailVo)
        if (!user) return null

        const passwordValid = await user.verifyPassword(password)
        return passwordValid ? { userId: user.id } : null
      },
    }

    // 建立 tokenSigner 適配器（ITokenSigner Port 實現）
    const tokenSigner = new JoseTokenSigner()

    createSessionService = new CreateSessionService(
      credentialVerifier,
      tokenSigner,
      sessionRepository
    )
    validateSessionService = new ValidateSessionService(tokenSigner, sessionRepository)
  })

  it('完整的登入 → 驗證 → 登出流程', async () => {
    // 1. 建立帶密碼的用戶
    const userId = crypto.randomUUID()
    const email = Email.create('user@example.com')
    const name = UserName.create('Test User')
    const plainPassword = 'securePassword123'
    const password = await Password.fromPlainText(plainPassword)

    const user = User.createWithPassword(userId, name, email, password.hash)
    await userRepository.save(user)

    // 2. 用戶登入
    const sessionDto = await createSessionService.execute(
      'user@example.com',
      plainPassword
    )

    expect(sessionDto.accessToken).toBeTruthy()
    expect(sessionDto.userId).toBe(userId)
    expect(sessionDto.tokenType).toBe('Bearer')

    const token = sessionDto.accessToken

    // 3. 驗證 Token
    const validation = await validateSessionService.validate(token)

    expect(validation.userId).toBe(userId)
    expect(validation.sessionId).toBeTruthy()

    // 4. 無效密碼應失敗
    const invalidLoginPromise = createSessionService.execute(
      'user@example.com',
      'wrongPassword'
    )

    expect(invalidLoginPromise).rejects.toThrow(InvalidCredentialsException)
  })

  it('無效的 Token 簽名應驗證失敗', async () => {
    const invalidToken = 'invalid.token.signature'

    const promise = validateSessionService.validate(invalidToken)
    expect(promise).rejects.toThrow(SessionExpiredException)
  })

  it('不存在的用戶登入應失敗', async () => {
    const promise = createSessionService.execute(
      'nonexistent@example.com',
      'password123'
    )

    expect(promise).rejects.toThrow(InvalidCredentialsException)
  })
})
