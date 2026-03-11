/**
 * Drizzle 倉儲實現 - 整合測試
 *
 * 驗證各模組的 Repository 是否能正確透過 Drizzle 驅動進行 CRUD。
 *
 * @module test/integration/repositories/DrizzleRepositories
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { createDrizzleDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Drizzle'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { Title } from '@/Modules/Post/Domain/ValueObjects/Title'
import { Content } from '@/Modules/Post/Domain/ValueObjects/Content'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'

describe('Drizzle 倉儲整合測試', () => {
  let db: IDatabaseAccess
  let userRepo: UserRepository
  let postRepo: PostRepository

  beforeAll(async () => {
    // 確保環境變數為測試用的 sqlite
    process.env.DATABASE_URL = 'file:test.db'
    
    db = createDrizzleDatabaseAccess()
    userRepo = new UserRepository(db)
    postRepo = new PostRepository(db)

    // 獲取底層 client 並建立必要的表
    const drizzle = (db as any).db || require('@/Shared/Infrastructure/Database/Adapters/Drizzle/config').getDrizzleInstance()
    try {
      // 先刪除舊的表
      await drizzle.run('DROP TABLE IF EXISTS posts')
      await drizzle.run('DROP TABLE IF EXISTS users')

      // 建立新的表
      await drizzle.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, created_at TEXT, updated_at TEXT)')
      await drizzle.run('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT, author_id TEXT NOT NULL, created_at TEXT, updated_at TEXT)')
    } catch (e) {
      // 忽略表已存在的錯誤
    }
  })

  it('應該能在 Drizzle 驅動下操作用戶倉庫 (UserRepo)', async () => {
    const id = `drizzle-user-${Date.now()}`
    const emailStr = `drizzle-${id}@sql.com`
    const email = Email.create(emailStr)
    const name = UserName.create('Drizzle User')
    const user = User.create(id, name, email)

    // 1. 保存
    await userRepo.save(user)

    // 2. 查詢
    const found = await userRepo.findById(id)
    expect(found).toBeDefined()
    expect(found?.name.value).toBe('Drizzle User')

    // 3. 按 Email 查詢 (業務方法)
    const byEmail = await userRepo.findByEmail(email)
    expect(byEmail?.id).toBe(id)
  })

  it('應該能在 Drizzle 驅動下操作文章倉庫 (PostRepo)', async () => {
    const id = `drizzle-post-${Date.now()}`
    const title = Title.create('Hello Drizzle')
    const content = Content.create('Database swappability test')
    const authorId = 'user-1'
    const post = Post.create(id, title, content, authorId)

    // 1. 保存
    await postRepo.save(post)

    // 2. 查詢
    const found = await postRepo.findById(id)
    expect(found).toBeDefined()
    expect(found?.title.value).toBe('Hello Drizzle')

    // 3. 列表
    const all = await postRepo.findAll({ limit: 1 })
    expect(all.length).toBeGreaterThan(0)

    // 4. 計數
    const count = await postRepo.count()
    expect(count).toBeGreaterThan(0)
  })
})
