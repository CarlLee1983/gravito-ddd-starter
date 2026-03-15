# 數據庫測試隔離策略

## 目標

消除測試副作用資產，建立乾淨且隔離的測試數據庫環境。

---

## 現狀

### 存在的問題

❌ **測試 DB 持久化到磁碟**
- `storage/test.db` - 測試環境 SQLite
- `gravito.db` / `test.db` - 根目錄遺留檔案（已清理）

❌ **測試間無隔離**
- 多個測試共用同一 DB 檔案
- 測試狀態相互影響

❌ **清理機制缺失**
- 測試後不清理 DB 檔案
- 磁碟持續積累測試資料

---

## 改進方案

### 1️⃣ **單一真實來源 (SSOT) - 主數據庫**

```
database/database.sqlite  ← 開發/正式環境
```

### 2️⃣ **測試隔離策略**

#### 方案 A: 內存 SQLite（推薦）

```typescript
// test.setup.ts
import Database from 'better-sqlite3'

export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:')  // 內存數據庫
  // 執行 migration
  return db
}
```

**優勢**：
- ✅ 無磁碟 I/O
- ✅ 測試間完全隔離
- ✅ 速度快（內存操作）
- ✅ 自動清理（進程結束時釋放）

**缺點**：
- ⚠️ 無法複現磁碟相關 bug

#### 方案 B: 臨時檔案隔離

```typescript
// test.setup.ts
import { tmpNameSync } from 'tmp'

export function createTestDatabase(): string {
  const tmpPath = tmpNameSync({ suffix: '.db' })
  // 執行 migration，建立 DB
  return tmpPath
}

// test.teardown.ts
export function cleanupTestDatabase(dbPath: string) {
  fs.unlinkSync(dbPath)  // 測試後刪除
}
```

**優勢**：
- ✅ 磁碟操作完整測試
- ✅ 偵錯時可檢查 DB 狀態

**缺點**：
- ⚠️ 磁碟 I/O 開銷
- ⚠️ 需要手動清理

---

## 實施檢查清單

### 環境分離

- [ ] `.env.test` - 指定 `:memory:` 或臨時 DB 路徑
- [ ] `vitest.config.ts` - 設置測試環境變量
- [ ] 不同 DB 連接池配置（測試 vs 開發）

### 測試生命週期

- [ ] `beforeAll()` - 建立測試 DB + 執行 migration
- [ ] `afterEach()` - 清空表數據（可選，如用內存 DB）
- [ ] `afterAll()` - 清理 DB（關閉連接）

### 執行驗證

```bash
# 單元測試（內存 DB）
bun test --run

# 集成測試（臨時檔案隔離）
bun test:integration --run

# 清理驗證
ls -la storage/*.db  # 應為空
```

---

## .gitignore 更新

已更新規則，確保以下檔案被忽略：

```gitignore
# 數據庫檔案
*.db
*.sqlite
*.sqlite3
database/*.db
database/*.sqlite
storage/**/*.db
storage/**/*.sqlite

# 臨時和快取
storage/tmp/**
storage/framework/cache/**
```

---

## 相關配置檔案

| 檔案 | 用途 |
|------|------|
| `config/app/database.ts` | 數據庫連接配置 |
| `config/tools/drizzle.config.ts` | ORM 配置 |
| `vitest.config.ts` | 測試框架設置 |
| `.env.test` | 測試環境變量 |

---

## 後續行動

### 短期（立即）
- ✅ 更新 .gitignore
- ✅ 清理遺留 DB 檔案
- [ ] 建立 `vitest.setup.ts`

### 中期（本週）
- [ ] 實施測試 DB 隔離（內存 or 臨時檔案）
- [ ] 更新所有測試生命週期鉤子
- [ ] 驗證測試隔離有效性

### 長期（優化）
- [ ] 並行測試（需要獨立 DB）
- [ ] 測試快照儲存（git 追蹤，不存 DB）
- [ ] 集成測試 CI/CD 最佳實踐

---

**更新**: 2026-03-15
**維護者**: gravito-ddd 團隊
