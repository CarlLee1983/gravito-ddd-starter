# Phase 5: 豐富領域模型行為

**狀態**: ⏳ 計畫中 | **目標**: 為 User 和 Post 聚合根添加行為方法
**預期完成**: 2026-03-12 | **目標測試**: 40+ 新測試

## 📋 Phase 5 任務清單

### Task 1: User 聚合根行為擴展
- [ ] `changeName(newName: UserName): void`
  - 驗證新名稱有效性
  - 發佈 `UserNameChanged` 事件
  - 更新 `_name` 私有屬性

- [ ] `changeEmail(newEmail: Email): void`
  - 驗證新電子郵件有效性
  - 檢查是否與現有郵件相同（無需要變更）
  - 發佈 `UserEmailChanged` 事件
  - 更新 `_email` 私有屬性

- [ ] Domain Events:
  - [x] UserCreated (already exists)
  - [ ] UserNameChanged.ts
  - [ ] UserEmailChanged.ts

### Task 2: Post 聚合根行為擴展
- [ ] `publish(): void`
  - 標記文章為已發佈
  - 發佈 `PostPublished` 事件
  - 新增 `_isPublished: boolean` 狀態

- [ ] `archive(): void`
  - 標記文章為已存檔（禁止進一步編輯）
  - 發佈 `PostArchived` 事件
  - 新增 `_isArchived: boolean` 狀態

- [ ] `changeTitle(newTitle: Title): void`
  - 驗證標題有效性
  - 不允許存檔後修改
  - 發佈 `PostTitleChanged` 事件

- [ ] Domain Events:
  - [x] PostCreated (already exists)
  - [ ] PostPublished.ts
  - [ ] PostArchived.ts
  - [ ] PostTitleChanged.ts

### Task 3: Repository 層更新
- [ ] User 層適配 `changeName()`、`changeEmail()`
  - applyEvent() 實現 UserNameChanged、UserEmailChanged 邏輯
  - toDomain/toRow 映射新狀態

- [ ] Post 層適配 `publish()`、`archive()`、`changeTitle()`
  - applyEvent() 實現各事件邏輯
  - toDomain/toRow 映射新狀態 (is_published, is_archived)

- [ ] Database Migrations
  - [ ] 001_create_users_table: 無需改動
  - [ ] 002_create_posts_table: 新增 is_published、is_archived 欄位

- [ ] Drizzle Schema
  - [ ] users 表: 無需改動
  - [ ] posts 表: 新增 is_published、is_archived 字段

### Task 4: Application 層服務
- [ ] UpdateUserService.ts
  - changeName()、changeEmail() 協調
  - 驗證電子郵件唯一性（如果變更）
  - 事件分派

- [ ] UpdatePostService.ts
  - publish()、archive()、changeTitle() 協調
  - 驗證不存檔的 Post 才能編輯
  - 事件分派

### Task 5: Integration Events (ACL)
- [ ] UserRepository 轉換新事件為 IntegrationEvent
  - UserNameChanged → 其他 Context 可訂閱
  - UserEmailChanged → 其他 Context 可訂閱

- [ ] PostRepository 轉換新事件為 IntegrationEvent
  - PostPublished → 通知、推薦系統可訂閱
  - PostArchived → 清理索引等
  - PostTitleChanged → SEO 系統可訂閱

### Task 6: 測試層 (40+ 新測試)

#### User 相關 (15+ 測試)
- [x] changeName()
  - 成功變更名稱
  - 發佈 UserNameChanged 事件
  - applyEvent() 正確更新狀態
  - 名稱驗證（長度、格式等）
  - 不可變性

- [x] changeEmail()
  - 成功變更郵件
  - 發佈 UserEmailChanged 事件
  - applyEvent() 正確更新狀態
  - 郵件驗證
  - 相同郵件時無事件

#### Post 相關 (20+ 測試)
- [x] publish()
  - 發佈文章成功
  - 發佈 PostPublished 事件
  - applyEvent() 設定 _isPublished
  - 已發佈的文章無法重複發佈

- [x] archive()
  - 存檔文章成功
  - 發佈 PostArchived 事件
  - applyEvent() 設定 _isArchived
  - 已存檔的文章無法再發佈

- [x] changeTitle()
  - 成功變更標題
  - 發佈 PostTitleChanged 事件
  - applyEvent() 更新狀態
  - 存檔後禁止變更標題
  - 標題驗證

#### 跨 Bounded Context (5+ 測試)
- [ ] UserNameChangedHandler (如果有訂閱者)
- [ ] PostPublishedHandler (通知系統等)
- [ ] PostArchivedHandler (清理系統等)

## 🎯 DDD 核心模式

### 1. 不可變聚合根 + 事件驅動

```typescript
// User 行為
export class User extends AggregateRoot {
  private _name!: UserName
  private _email!: Email

  // 行為方法：只發佈事件，不修改狀態
  changeName(newName: UserName): void {
    if (this._name.equals(newName)) return // 相同名稱無需變更
    this.raiseEvent(new UserNameChanged(this.id, newName.value))
  }

  // 事件應用：由 applyEvent() 實際修改狀態
  applyEvent(event: DomainEvent): void {
    if (event instanceof UserCreated) {
      // ...
    } else if (event instanceof UserNameChanged) {
      this._name = UserName.create(event.newName)
    }
  }
}
```

### 2. 完整的事件契約

```typescript
// UserNameChanged.ts
export class UserNameChanged extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly newName: string,
  ) {
    super()
  }

  toJSON() {
    return {
      aggregateId: this.userId,
      eventType: this.constructor.name,
      newName: this.newName,
      occurredAt: this.occurredAt.toISOString(),
    }
  }
}
```

### 3. Repository 層完整支援

```typescript
// UserRepository
private toDomain(row: any): User {
  const user = User.reconstitute(row.id, ...)
  // 無需處理 is_published 等（Post 特有）
  return user
}

private toRow(user: User): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name.value,
    email: user.email.value,
    created_at: user.createdAt.toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// PostRepository
private toDomain(row: any): Post {
  const post = Post.reconstitute(
    row.id,
    Title.create(row.title),
    Content.create(row.content),
    row.author_id,
    row.created_at,
    row.is_published === 1, // 新增
    row.is_archived === 1,  // 新增
  )
  return post
}

private toRow(post: Post): Record<string, unknown> {
  return {
    id: post.id,
    title: post.title.value,
    content: post.content.value,
    author_id: post.authorId,
    is_published: post.isPublished ? 1 : 0,
    is_archived: post.isArchived ? 1 : 0,
    created_at: post.createdAt.toISOString(),
    updated_at: new Date().toISOString(),
  }
}
```

## 📊 實施時序

1. **User 層**: changeName() + changeEmail()
2. **Domain Events**: UserNameChanged + UserEmailChanged
3. **Post 層**: publish() + archive() + changeTitle()
4. **Post Domain Events**: PostPublished + PostArchived + PostTitleChanged
5. **Repository 層**: toDomain/toRow 映射
6. **Database Migration**: users/posts 表新增字段
7. **Application 層**: UpdateUserService + UpdatePostService
8. **Integration Events**: ACL 轉換
9. **測試**: 40+ 新測試

## ✅ 完成標準

- [ ] 所有行為方法實現完成
- [ ] Domain Events 完整定義
- [ ] applyEvent() 正確應用所有事件
- [ ] Repository 層完整支援所有新狀態
- [ ] Database Schema 已更新
- [ ] 40+ 新測試全部通過
- [ ] Integration Events 已定義
- [ ] 無 Breaking Changes（向後相容）
