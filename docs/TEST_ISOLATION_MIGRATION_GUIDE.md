# 測試隔離遷移指南

本指南幫助你將現存測試遷移到新的隔離機制。

---

## 概述

### 新測試隔離基礎設施

| 元件 | 位置 | 用途 |
|------|------|------|
| 全局 Setup | `tests/setup.ts` | 環境初始化 + 數據庫工廠 |
| 工具庫 | `tests/helpers.ts` | 測試工廠 + 數據工廠 + 斷言 |
| 範本 | `tests/Integration/ExampleRepositoryTest.template.ts` | 新測試參考 |
| 驗證 | `tests/cleanup-verify.ts` | 清理檢查（CI/CD） |

### 核心改進

✅ **內存 SQLite** - 無磁碟 I/O
✅ **自動隔離** - 每個測試獨立環境
✅ **零副作用** - 測試後自動清理
✅ **DI 容器** - 簡化依賴注入
✅ **數據工廠** - 快速建立測試數據

---

## 遷移步驟

### 步驟 1️⃣：認識現存測試

你有 4 類測試：

```
tests/
├── Unit/           # 單元測試（通常無 DB 依賴）
├── Integration/    # 集成測試（可能需要 DB）
├── Functional/     # 功能測試（端到端 Hook 測試）
└── E2E/            # E2E 測試（Playwright 瀏覽器測試）
```

**優先級**：Integration 測試最需要隔離機制

### 步驟 2️⃣：確認現有模式

執行以下命令查看現存測試結構：

```bash
# 查看有 beforeEach/afterEach 的測試
grep -r "beforeEach\|afterEach" tests/ --include="*.ts" | head -20

# 查看是否有 DB 相關的測試
grep -r "database\|repository\|\.db" tests/ --include="*.ts" | head -10
```

### 步驟 3️⃣：測試分類

#### A. 單元測試（不需修改）

大多數 `tests/Unit/` 中的測試只測試邏輯，不涉及 DB。

```typescript
// ✅ 無需修改
it('should calculate discount', () => {
  const total = calculatePrice(100, 0.1)
  expect(total).toBe(90)
})
```

#### B. Integration 測試（需要遷移）

如果你的 Integration 測試需要真實 DB，遷移至新機制。

**舊模式**：

```typescript
// ❌ 舊方式 - 使用磁碟 DB
beforeEach(async () => {
  const db = new Database('./test.db')
  // 問題：留下副作用資產
})
```

**新模式**：

```typescript
// ✅ 新方式 - 使用內存 DB
import { setupTestDatabase } from '../setup'

beforeEach(async () => {
  const dbPath = await setupTestDatabase(true) // 內存 DB
  // 自動隔離，無磁碟 I/O
})

afterEach(async () => {
  await cleanupTestDatabase(dbPath)
})
```

### 步驟 4️⃣：實施遷移

#### 4.1 複製範本

```bash
# 複製範本到你的測試
cp tests/Integration/ExampleRepositoryTest.template.ts \
   tests/Integration/YourModule/YourTest.ts
```

#### 4.2 修改模板

編輯新檔案，替換：

```typescript
// 1. 描述
describe('YourRepository Integration Test', () => {

// 2. 註冊你的依賴
container.singleton('yourService', () => {
  // 你的實現
})

// 3. 修改測試
it('should do something', async () => {
  const service = container.make('yourService')
  // 你的測試
})
```

#### 4.3 更新現存測試

如果不想重寫，至少做最小改動：

```typescript
// 修改前
import Database from 'better-sqlite3'
let db: Database.Database

beforeEach(() => {
  db = new Database('./test.db')
})

// 修改後
import { setupTestDatabase, cleanupTestDatabase } from '../setup'
let dbPath: string

beforeEach(async () => {
  dbPath = await setupTestDatabase(true)
})

afterEach(async () => {
  await cleanupTestDatabase(dbPath)
})
```

---

## 常見遷移場景

### 場景 1：Repository 測試

```typescript
import { setupTestDatabase, cleanupTestDatabase, MockContainer, DataFactory } from '../setup'

describe('UserRepository', () => {
  let dbPath: string
  let repo: UserRepository
  let factory: DataFactory

  beforeEach(async () => {
    dbPath = await setupTestDatabase(true)
    factory = new DataFactory()

    // 你可能需要：
    // 1. 執行 migration
    // 2. 初始化 Repository
  })

  afterEach(async () => {
    await cleanupTestDatabase(dbPath)
    factory.reset()
  })

  it('should find user by id', async () => {
    const user = factory.user()
    await repo.create(user)

    const found = await repo.findById(user.id)
    expect(found).toBeDefined()
  })
})
```

### 場景 2：Service 測試

```typescript
import { createServiceTest, DataFactory, testAssertions } from '../helpers'

createServiceTest('OrderService', (container) => {
  let service: OrderService
  let factory: DataFactory

  beforeEach(() => {
    service = container.make('orderService')
    factory = new DataFactory()
  })

  it('should create order', async () => {
    const orderData = factory.order()
    const order = await service.create(orderData)

    expect(order.id).toBeDefined()
  })
})
```

### 場景 3：事件驅動測試

```typescript
it('should emit event on save', async () => {
  const events: any[] = []

  // 模擬事件分發器
  container.singleton('eventDispatcher', () => ({
    publish: (event: any) => events.push(event),
  }))

  const repo = container.make('userRepository')
  const user = factory.user()

  await repo.save(user)

  // 驗證事件發佈
  expect(events).toHaveLength(1)
  expect(events[0].type).toBe('UserCreated')
})
```

---

## 驗證遷移成功

### 1. 執行測試

```bash
bun test tests/Integration/
```

### 2. 驗證清理

```bash
# 應無 DB 檔案遺留
bun run tests/cleanup-verify.ts
```

預期輸出：

```
✅ 測試隔離驗證通過
✨ 沒有檢測到副作用資產
✨ 所有 DB 檔案已正確清理
```

### 3. 檢查 git status

```bash
git status

# 應該顯示：
# working tree clean
# （沒有 .db 檔案）
```

---

## 常見問題

### Q: 我的測試需要真實數據庫連接怎麼辦？

**A**: 如果需要測試磁碟相關的 bug，使用臨時檔案模式：

```typescript
// 使用臨時檔案而不是內存
const dbPath = await setupTestDatabase(false)
```

但務必在 `afterEach` 中清理：

```typescript
afterEach(async () => {
  await cleanupTestDatabase(dbPath)
})
```

### Q: 如何在 CI/CD 中確保測試隔離？

**A**: 在 package.json 中添加驗證：

```json
{
  "scripts": {
    "test": "bun test && bun run tests/cleanup-verify.ts"
  }
}
```

### Q: 我想並行執行測試怎麼辦？

**A**: 每個測試檔案必須使用獨立的 `setupTestDatabase()` 呼叫：

```typescript
// ✅ 正確 - 每個測試有獨立 DB
describe('Test A', () => {
  let dbPath: string
  beforeEach(async () => { dbPath = await setupTestDatabase(true) })
})

describe('Test B', () => {
  let dbPath: string
  beforeEach(async () => { dbPath = await setupTestDatabase(true) })
})
```

### Q: 如何 Mock ORM？

**A**: 使用 `MockContainer` 和 Mock Repository：

```typescript
container.singleton('database', () => ({
  getRepository: (entity) => ({
    findById: mock(async (id) => ({ id, name: 'Test' })),
    create: mock(async (data) => ({ id: '1', ...data })),
  }),
}))
```

---

## 遷移檢查清單

- [ ] 理解新的測試隔離機制
- [ ] 識別需要遷移的 Integration 測試
- [ ] 複製並修改 `ExampleRepositoryTest.template.ts`
- [ ] 更新現存 Integration 測試
- [ ] 執行 `bun test tests/Integration/`
- [ ] 驗證 `bun run tests/cleanup-verify.ts` 通過
- [ ] 檢查 git 無遺留 DB 檔案
- [ ] 在 CI/CD 中添加 cleanup-verify 步驟

---

## 預期改進

| 指標 | 改進 |
|------|------|
| 測試執行速度 | ↑ 20-50%（無磁碟 I/O） |
| 磁碟使用 | ↓ 消除副作用資產 |
| 測試隔離 | ✅ 完全隔離 |
| 錯誤調試 | ✅ 清晰的失敗原因 |

---

## 相關文檔

- 📋 [DATABASE_TESTING_STRATEGY.md](./DATABASE_TESTING_STRATEGY.md) - 測試策略概述
- 📝 [tests/setup.ts](../tests/setup.ts) - 全局 Setup 實現
- 🛠️ [tests/helpers.ts](../tests/helpers.ts) - 測試工具庫
- 📖 [tests/Integration/ExampleRepositoryTest.template.ts](../tests/Integration/ExampleRepositoryTest.template.ts) - 範本實現

---

**更新**: 2026-03-15
**遷移難度**: 低（大多數測試無需修改）
**預期完成時間**: 2-4 小時（全部 Integration 測試）
