# Gravito DDD Starter - 專案開發準則

> 本文檔定義此專案的核心架構原則和開發規範。所有團隊成員應遵循本準則。

---

## 🎯 核心願景

**可隨時抽換依賴的應用**

從 **Atlas → Drizzle/Prisma/TypeORM** 時，僅改動 `src/adapters/{ORM}/` 層，業務層代碼零改動。

---

## 📐 架構原則

### 清晰分層

```
Domain + Application (業務邏輯)
         ↓
Infrastructure + Adapters (ORM 適配層)
         ↓
ORM 實現 (可替換)
```

### 依賴方向

```
→ Domain 層無任何依賴
→ Application 層只依賴 IDatabaseAccess 等公開介面
→ Infrastructure 層實現 Repository，使用 IDatabaseAccess
→ Adapters 層集中所有 ORM 相關代碼
```

---

## ✅ 必須遵守的規則

### 1. Domain 層 - 業務邏輯（ORM 無關）

```typescript
// ✅ DO: 定義 Entity 和 Repository 介面
export class User {
  private readonly id: string
  constructor(id: string) { this.id = id }
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}

// ❌ DON'T: 導入任何 ORM
import { DB } from '@gravito/atlas'  // ← 禁止
```

### 2. Application 層 - Use Case（只用公開介面）

```typescript
// ✅ DO: 使用 IDatabaseAccess 介面
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class CreateUserUseCase {
  constructor(private db: IDatabaseAccess) {}

  async execute(email: string) {
    await this.db.table('users').insert({ email })
  }
}

// ❌ DON'T: 使用 ORM 特定型別
import type { Database } from 'drizzle-orm'  // ← 禁止
```

### 3. Infrastructure 層 - Repository 實現

```typescript
// ✅ DO: 實現 Domain 介面，使用 IDatabaseAccess
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class UserRepository implements IUserRepository {
  constructor(private db: IDatabaseAccess) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.table('users').where('id', '=', id).first()
    return row ? this.toDomain(row) : null
  }
}

// ❌ DON'T: 導入具體 ORM 或暴露 ORM 方法
import { DB } from '@gravito/atlas'  // ← 禁止放在 Repository 中
```

### 4. Migration 層 - SchemaBuilder（ORM 無關）

```typescript
// ✅ DO: 使用 SchemaBuilder
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: any): Promise<void> {
  await createTable(db, 'users', (t) => {
    t.id()
    t.string('email').unique()
    t.timestamps()
  })
}

// ❌ DON'T: 寫原始 SQL
await db.connection.execute(sql`CREATE TABLE users (...)`)  // ← 避免
```

### 5. Adapters 層 - ORM 集中地

```typescript
// ✅ DO: 所有 ORM 代碼集中在 adapters/{ORM}/ 下
// src/adapters/Atlas/
//   ├── GravitoDatabaseAdapter.ts
//   ├── AtlasSchemaBuilder.ts
//   └── README.md (如何實現新 ORM)

// src/adapters/Drizzle/ (未來)
//   ├── DrizzleDatabaseAdapter.ts
//   ├── DrizzleSchemaBuilder.ts
//   └── README.md
```

---

## 🚫 禁止事項

| 項目 | 禁止 | 原因 |
|------|------|------|
| Domain 層 | `import '@gravito/atlas'` | Domain 應獨立，不知道 ORM |
| Application 層 | 使用 ORM 特定型別 | Application 應 ORM 無關 |
| Repository | 暴露 ORM 方法 | 隱藏實現細節 |
| Migration | 混用 SchemaBuilder 和 SQL | 保持一致性 |
| Adapters | 分散實現 | 集中管理，便於替換 |

---

## ✨ PR 檢查清單

提交 PR 時，檢查以下項目：

### Domain 層
- [ ] 沒有 import ORM（`@gravito`, `drizzle-orm`, `prisma` 等）
- [ ] Repository 都是介面定義，沒有實現

### Application 層
- [ ] 只使用 `IDatabaseAccess` 等公開介面
- [ ] 沒有 ORM 特定型別

### Infrastructure 層
- [ ] Repository 實現了 Domain 介面
- [ ] 所有 ORM 導入都在 `src/adapters/{ORM}/` 目錄下

### Migration 層
- [ ] 使用 `SchemaBuilder`
- [ ] 不混用 SQL 和 SchemaBuilder

---

## 📊 規則遵循評分

| 級別 | 標準 | 可替換性 |
|------|------|---------|
| ⭐⭐⭐⭐⭐ | 完全隔離、完全隱藏、完全一致 | ✅ 可直接替換 ORM |
| ⭐⭐⭐⭐ | 隔離良好、隱藏良好、基本一致 | ✅ 換 ORM 需小改 |
| ⭐⭐⭐ | 部分隔離、部分隱藏、部分一致 | ⚠️ 換 ORM 需大改 |
| ⭐⭐ | 隔離不足、隱藏不足、不一致 | ❌ 換 ORM 困難 |

**目標**：所有代碼至少達到 ⭐⭐⭐⭐ 級別

---

## 🔗 相關文檔

- `docs/ABSTRACTION_RULES.md` - 完整的 DO/DON'T 列表和範例
- `docs/IMPLEMENTATION_PLAN.md` - 5 Phase 實施計畫
- `docs/ARCHITECTURE_DECISIONS.md` - 架構決策日誌
- `docs/DATABASE.md` - 數據庫操作指南

---

## 🆘 常見問題

### Q: 違反規則了怎麼辦？

**A**:
1. **新代碼**：必須遵守規則（PR 不通過）
2. **舊代碼**：記錄並計畫漸進式重構

### Q: 需要 ORM 特定功能怎麼辦？

**A**:
1. 先在 `IDatabaseAccess` 中添加新方法
2. 在所有 ORM adapter 中實現該方法
3. 然後在 Application 層使用新方法

### Q: 何時改用其他 ORM？

**A**: 當以下條件滿足時：
- 遵循此準則的代碼達到 >90%
- 實現了至少一個替代 ORM 的 adapter（如 Drizzle）
- 通過了「可替換性測試」

---

## 📋 開發流程

### 新增功能

1. **設計階段**：確保 Repository 介面定義清晰
2. **實現階段**：Domain → Application → Infrastructure
3. **測試階段**：驗證 Domain 不依賴 ORM
4. **PR 檢查**：檢查是否違反規則

### ORM 遷移

1. **分析**：確認代碼遵循 >90% 規則
2. **實現**：新建 `src/adapters/{NewORM}/`
3. **遷移**：逐步替換 adapter factory
4. **驗證**：所有測試通過

---

**最後更新**: 2026-03-10
**版本**: 1.0
**狀態**: 🟢 Active
**審批者**: Carl

