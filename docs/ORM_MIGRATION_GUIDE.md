# ORM 遷移指南 - 可替換依賴的完整流程

> 本指南演示如何使用可替換性測試驗證新 ORM 適配器，確保零業務邏輯改動的 ORM 遷移

---

## 🎯 快速概覽

此專案採用**依賴反轉原則**，使得任何 ORM 都可以無縫替換：

```
┌─────────────────────────────────────┐
│   業務邏輯層（Domain + Application） │ ← 完全不依賴 ORM
└─────────────────────────────────────┘
               ↓ 依賴
    ┌──────────────────────┐
    │   公開介面           │
    │ (IDatabaseAccess)    │
    └──────────────────────┘
               ↓ 實現
┌─────────────────────────────────────┐
│   適配器層（Atlas / Drizzle / etc）   │ ← 可隨時替換
└─────────────────────────────────────┘
```

---

## 📋 遷移檢查清單

### ✅ 階段 1：驗證舊 ORM（Atlas）

```bash
# 1. 執行現有可替換性測試
bun test test/integration/adapters/RepositorySwappability.test.ts
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts
bun test test/integration/wiring/ContainerSwappability.test.ts

# 預期結果：所有測試通過 ✅
```

### ✅ 階段 2：實現新 ORM（例：Drizzle）

按照 `DRIZZLE_ADAPTER_ROADMAP.md`：

1. **建立適配器目錄**
   ```bash
   mkdir -p src/adapters/Drizzle
   ```

2. **實現 QueryBuilder**
   - `DrizzleQueryBuilder.ts`：實現 `IQueryBuilder` 介面
   - 支援所有方法：where、first、select、insert、update、delete、limit、offset、orderBy、whereBetween、count

3. **實現 DatabaseAccess**
   - `DrizzleDatabaseAdapter.ts`：實現 `IDatabaseAccess` 介面
   - 返回 `DrizzleQueryBuilder` 實例

4. **實現連線檢查**
   - `DrizzleConnectivityCheck.ts`：實現 `IDatabaseConnectivityCheck` 介面

5. **暴露公開 API**
   - `index.ts`：匯出 `createDrizzleDatabaseAccess` 和 `createDrizzleConnectivityCheck`

### ✅ 階段 3：驗證新適配器

在可替換性測試中啟用 Drizzle 測試：

```typescript
// test/integration/adapters/DatabaseAccessSwappability.test.ts

describe('Drizzle DatabaseAccess - 可替換性驗證', () => {
  import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

  createDatabaseAccessSwappabilityTests(
    'Drizzle',
    () => createDrizzleDatabaseAccess()
  )
})
```

```bash
# 執行 Drizzle 適配器測試
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts

# 預期結果：Drizzle 測試也通過 ✅
```

### ✅ 階段 4：驗證 Repository 適配器

實現 Drizzle 版本的 Repository：

```typescript
// src/adapters/Drizzle/Repositories/DrizzleUserRepository.ts

import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import { createDrizzleDatabaseAccess } from '..'
import { User } from '@/Modules/User/Domain/Aggregates/User'

class DrizzleUserRepository implements IUserRepository {
  private db = createDrizzleDatabaseAccess()

  async save(user: User): Promise<void> {
    await this.db.table('users').insert({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: new Date(),
    })
  }

  // 實現其他方法...
}

export function createDrizzleUserRepository(): IUserRepository {
  return new DrizzleUserRepository()
}
```

在可替換性測試中啟用 Drizzle Repository 測試：

```typescript
// test/integration/adapters/RepositorySwappability.test.ts

import { createDrizzleUserRepository } from '@/adapters/Drizzle/Repositories'

describe('User Repository - 可替換性驗證', () => {
  // 現有 Atlas 測試
  it('in-memory 實現應該通過所有測試', async () => {
    const { UserRepository } = await import('@/Modules/User/Infrastructure/Persistence/UserRepository')
    createUserRepositoryTests(() => new UserRepository())
  })

  // 新增 Drizzle 測試
  it('Drizzle 實現應該通過所有測試', async () => {
    const { createDrizzleUserRepository } = await import('@/adapters/Drizzle')
    createUserRepositoryTests(() => createDrizzleUserRepository())
  })
})
```

### ✅ 階段 5：切換生產環境

在 Wiring 層改變導入路徑：

**之前（使用 Atlas）：**
```typescript
// src/wiring/index.ts
import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createGravitoDatabaseAccess()
  container.singleton('postRepository', () => new PostRepository(db))
  // ...
}
```

**之後（使用 Drizzle）：**
```typescript
// src/wiring/index.ts
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'  // ← 只改這行
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createDrizzleDatabaseAccess()  // ← 只改這行
  container.singleton('postRepository', () => new PostRepository(db))
  // ... 其他代碼完全不改！
}
```

### ✅ 階段 6：運行完整測試套件

```bash
# 運行所有適配器測試
bun test test/integration/adapters/

# 運行所有 Wiring 測試
bun test test/integration/wiring/

# 運行整個應用測試
bun test

# 預期結果：所有測試通過 ✅
```

---

## 🔄 常見遷移場景

### 場景 1：Atlas → Drizzle

```bash
# 1. 實現 Drizzle 適配器（參考 DRIZZLE_ADAPTER_ROADMAP.md）
mkdir -p src/adapters/Drizzle
# ... 實現代碼 ...

# 2. 驗證 Drizzle 適配器通過所有測試
bun test test/integration/adapters/DatabaseAccessSwappability.test.ts

# 3. 在 src/wiring/index.ts 中改變導入
- import { createGravitoDatabaseAccess } from '@/adapters/Atlas'
+ import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

# 4. 運行完整測試套件
bun test

# 完成！✅
```

### 場景 2：Atlas → Prisma

完全相同的流程，只需改變適配器名稱：

```bash
mkdir -p src/adapters/Prisma
# 實現 PrismaDatabaseAdapter.ts
# 實現 PrismaQueryBuilder.ts
# ... 等等 ...

# 在 wiring 中改變導入
import { createPrismaDatabaseAccess } from '@/adapters/Prisma'
```

### 場景 3：多個 ORM 並行測試

可以同時對多個 ORM 執行相同測試，確保兼容性：

```typescript
// test/integration/adapters/AllAdaptersSwappability.test.ts

describe('所有 ORM 適配器 - 相同測試套件', () => {
  // Atlas
  createDatabaseAccessSwappabilityTests('Atlas', () => createGravitoDatabaseAccess())

  // Drizzle
  createDatabaseAccessSwappabilityTests('Drizzle', () => createDrizzleDatabaseAccess())

  // Prisma
  createDatabaseAccessSwappabilityTests('Prisma', () => createPrismaDatabaseAccess())
})
```

---

## 📊 成功指標

遷移成功的標記：

| 指標 | 預期 | 驗證方法 |
|-----|------|--------|
| **業務邏輯零改動** | 0 個文件在 Domain/Application 層改動 | `git diff --name-only HEAD~1 src/Modules/` |
| **Repository 通過測試** | 100% 測試通過 | `bun test test/integration/adapters/` |
| **DatabaseAccess 通過測試** | 100% 測試通過 | `bun test test/integration/adapters/` |
| **Container 通過測試** | 100% 測試通過 | `bun test test/integration/wiring/` |
| **應用可啟動** | 應用啟動無錯誤 | `bun run dev` 不拋出錯誤 |
| **基本功能正常** | 所有 API 端點正常 | 執行端到端測試 |

---

## ⚠️ 常見陷阱

### ❌ 陷阱 1：改動業務層代碼

**錯誤**：
```typescript
// ❌ 不要這樣做
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'  // 在業務層導入！

export class UserService {
  private db = createDrizzleDatabaseAccess()  // 業務層耦合 ORM！
}
```

**正確**：
```typescript
// ✅ 正確做法
export class UserService {
  constructor(private repository: IUserRepository) {}  // 只依賴介面
}
```

### ❌ 陷阱 2：忘記實現所有 QueryBuilder 方法

某個方法未實現會導致運行時錯誤：

```typescript
// ❌ 不完整
class DrizzleQueryBuilder implements IQueryBuilder {
  where(...) { /* ... */ }
  first() { /* ... */ }
  // ❌ 忘記實現 select()！
}

// 測試會失敗
await db.table('users').select()  // 錯誤：select is not a function
```

**修復**：確保實現所有必要方法：

```typescript
// ✅ 完整
class DrizzleQueryBuilder implements IQueryBuilder {
  where(...) { /* ... */ }
  first() { /* ... */ }
  select() { /* ... */ }  // ✅ 實現
  insert() { /* ... */ }  // ✅ 實現
  update() { /* ... */ }  // ✅ 實現
  delete() { /* ... */ }  // ✅ 實現
  // ... 所有其他方法
}
```

### ❌ 陷阱 3：忘記更新 Wiring 層

如果忘記在 wiring 層改變導入，應用會使用舊 ORM：

```typescript
// ❌ 忘記改變
import { createGravitoDatabaseAccess } from '@/adapters/Atlas'  // 仍使用 Atlas！

export function wireApplicationDependencies(container: IContainer): void {
  const db = createGravitoDatabaseAccess()  // 仍使用 Atlas
}
```

**修復**：在 wiring 層改變導入：

```typescript
// ✅ 正確
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

export function wireApplicationDependencies(container: IContainer): void {
  const db = createDrizzleDatabaseAccess()  // 使用 Drizzle
}
```

---

## 🧪 測試驗證檢查清單

完成 ORM 遷移時，請驗證：

- [ ] 所有 `RepositorySwappability.test.ts` 測試通過
- [ ] 所有 `DatabaseAccessSwappability.test.ts` 測試通過
- [ ] 所有 `ContainerSwappability.test.ts` 測試通過
- [ ] 應用正常啟動（`bun run dev`）
- [ ] 所有 API 端點正常工作
- [ ] 資料庫連線正常（health check `/health` 通過）
- [ ] 沒有在業務層代碼中發現 ORM 特定的導入
- [ ] Git diff 顯示只有適配器層代碼改動

---

## 📚 相關資源

- `docs/ABSTRACTION_RULES.md` - 依賴抽象化規則
- `docs/DRIZZLE_ADAPTER_ROADMAP.md` - Drizzle 實作指南
- `src/adapters/Atlas/README.md` - Atlas 適配器參考
- `test/integration/adapters/` - 所有可替換性測試
- `docs/ARCHITECTURE_DECISIONS.md` - 架構決策文檔

---

## 🎓 最佳實踐

1. **完全依賴倒轉**：業務層只依賴介面，不依賴實現
2. **測試驅動遷移**：先通過測試再切換生產環境
3. **單一導入點**：只在 wiring 層導入 ORM 適配器
4. **鎖定 ORM 版本**：在 package.json 中鎖定版本以避免兼容性問題
5. **逐漸遷移**：可以在一個 Service 通過後再遷移下一個

---

**版本**: 1.0
**最後更新**: 2026-03-10
**狀態**: 🟢 Active
