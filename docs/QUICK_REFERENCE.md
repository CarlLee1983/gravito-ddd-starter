# 🚀 快速參考指南

開發過程中最常用的指令和快速檢查清單。

## 📋 常用指令速查表

### 🔧 開發和構建

```bash
# 開發模式（推薦）
bun run dev              # 啟動開發伺服器 (熱重載)
bun run dev:debug        # 啟動並啟用偵錯 (Inspector)

# 生產構建
bun run build            # 構建產生版本
bun run start            # 執行產生版本
```

### ✅ 代碼品質檢查

```bash
# 單獨檢查
bun run typecheck        # TypeScript 型別檢查
bun run lint             # 檢查代碼風格（Biome）
bun run format           # 自動格式化代碼
bun run format:check     # 檢查格式（不修改）

# 完整檢查
bun run check            # 執行 typecheck + lint + test
bun run verify           # 執行 check 並顯示覆蓋率
```

### 🧪 測試

```bash
# 基本測試
bun test                 # 執行所有測試
bun test --watch         # 監視模式（檔案變更時自動運行）
bun test --coverage      # 生成覆蓋率報告

# 特定測試
bun test tests/Unit/     # 運行單元測試
bun test tests/Integration/  # 運行整合測試
bun test tests/Feature/  # 運行功能測試
bun test --filter User   # 運行包含 "User" 的測試
```

### 🎯 模組生成

```bash
# 自定義模組生成器
bun run make:module Product              # 簡單模組（in-memory Repository）
bun run make:module Order --db           # 含資料庫支援的模組
bun run make:module Post --migration     # 含 migration/seeder 的模組
bun run make:module Session --redis --cache --db  # 多功能模組

# Gravito CLI Scaffold
bun run make:controller MyController     # 生成 Controller
bun run make:middleware MyMiddleware     # 生成 Middleware
bun run make:command MyCommand           # 生成 Command
bun run route:list                       # 列出所有路由
bun run tinker                           # 進入互動式 REPL
```

### 🗄️ 資料庫操作

**Migration 風格**：Laravel 風格的 SchemaBuilder（見 docs/DATABASE.md）

```typescript
// 快速例子：database/migrations/001_create_posts_table.ts
import type { AtlasOrbit } from '@gravito/atlas'
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
  await createTable(db, 'posts', (t) => {
    t.id()
    t.string('title').notNull()
    t.text('content')
    t.timestamps()
  })
}

export async function down(db: AtlasOrbit): Promise<void> {
  await dropTableIfExists(db, 'posts')
}
```

**Migration 指令**：
```bash
bun run migrate                  # 執行所有待執行的 migration
bun run migrate:status           # 查看遷移狀態
bun run migrate:rollback         # 回滾最後一批
bun run migrate:fresh            # 清除重跑所有 migration（危險操作）

# Seeder
bun run seed                     # 執行所有 seeder
bun run db:fresh                 # migrate:fresh + seed（一鍵重置）
```

### 📚 文檔和幫助

```bash
# 故障排查
bun run troubleshoot     # 診斷環境和配置
bun run setup            # 完整設置（安裝 + hooks + 驗證）

# 設置 Git Hooks
bun run setup:hooks      # 安裝 pre-commit 和 commit-msg hooks
```

---

## 📊 工作流程檢查清單

### ✨ 每次提交前

- [ ] 執行 `bun run check` 確保通過所有檢查
- [ ] 檢查 `bun test --coverage` 覆蓋率 ≥ 80%
- [ ] 執行 `bun run format` 自動格式化
- [ ] 查看 Git diff 無意外更改

### 🚀 推送之前

- [ ] 執行 `bun run verify` 完整檢查
- [ ] 測試在 `bun run dev` 下工作正常
- [ ] 檢查提交訊息格式是否正確
- [ ] 確認分支已更新至最新

### 📦 部署前

- [ ] 執行 `bun run build` 成功構建
- [ ] 測試 `bun run start` 在生產環境下工作
- [ ] 驗證所有環境變數已設置
- [ ] 檢查數據庫遷移已執行
- [ ] 查閱 [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🔥 常見任務

### 新增模組

```bash
# 1. 生成模組結構
bun gravito module generate Order --ddd-type advanced

# 2. 查看生成的結構
ls src/Modules/Order/

# 3. 實現業務邏輯
# src/Modules/Order/Domain/Order.ts
# src/Modules/Order/Application/CreateOrderUseCase.ts
# src/Modules/Order/Presentation/OrderController.ts

# 4. 運行測試
bun test tests/Feature/Order/

# 5. 提交
git add -A
git commit -m "feat: [Order] add Order module"
```

### 實現跨模組 ACL（防腐層）

若 Post 模組需要 User 資訊，在 Post 中建立 ACL：

```bash
# 1. 定義 Port（Post/Domain/Ports/）
# src/Modules/Post/Domain/Ports/IAuthorService.ts
export interface IAuthorService {
  findAuthor(authorId: string): Promise<AuthorDTO | null>
}

# 2. 實現 Adapter（Post/Infrastructure/Adapters/）
# src/Modules/Post/Infrastructure/Adapters/UserToPostAdapter.ts
export class UserToPostAdapter implements IAuthorService {
  constructor(private userRepository: IUserRepository) {}
  async findAuthor(authorId: string): Promise<AuthorDTO | null> {
    const user = await this.userRepository.findById(authorId)
    if (!user) return null
    return { id: user.id, name: user.name, email: user.email }
  }
}

# 3. 在 Controller 使用 Port（不知道 User）
# src/Modules/Post/Presentation/Controllers/PostController.ts
export class PostController {
  constructor(
    private postRepository: IPostRepository,
    private authorService: IAuthorService  // ← Port
  ) {}
  async show(ctx: IHttpContext) {
    const author = await this.authorService.findAuthor(post.userId)
    return ctx.json({ success: true, data: { ...post, author } })
  }
}

# 4. 在 Framework 層組裝（Wiring）
const authorService = new UserToPostAdapter(userRepository)
const controller = new PostController(postRepository, authorService)
```

詳見 [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md)

### 修復格式和 Lint 問題

```bash
# 自動修復所有 Lint 問題
bun run lint:fix

# 自動格式化所有代碼
bun run format

# 兩者都做
bun run lint:fix && bun run format
```

### 診斷環境問題

```bash
# 運行完整診斷
bun run troubleshoot

# 輸出會告訴你：
# ✅ 已安裝的工具版本
# ✅ 檔案和目錄是否存在
# ✅ 數據庫連接狀態
# ✅ Redis/Cache 狀態
# ✅ TypeScript 編譯狀態
# ✅ 埠可用性
```

### 更新依賴

```bash
# 更新所有依賴
bun update

# 添加新依賴
bun add <package-name>

# 添加開發依賴
bun add -D <package-name>

# 移除依賴
bun remove <package-name>
```

---

## 🚨 快速故障排查

### 錯誤：Port 3000 已被占用

```bash
# 解決方案 1：使用不同埠
PORT=3001 bun run dev

# 解決方案 2：殺死占用埠的進程
lsof -i :3000
kill -9 <PID>
```

### 錯誤：TypeScript 編譯失敗

```bash
# 1. 檢查錯誤
bun run typecheck

# 2. 查看 tsconfig.json 中的路徑別名
cat tsconfig.json | grep -A 5 paths

# 3. 確認文件存在
ls src/Shared/
```

### 錯誤：Module not found

```bash
# 1. 清除 cache
rm -rf node_modules bun.lockb

# 2. 重新安裝
bun install

# 3. 檢查 tsconfig paths
cat tsconfig.json | grep paths
```

### 錯誤：測試失敗

```bash
# 1. 運行特定測試以查看詳細錯誤
bun test tests/Unit/MyTest.test.ts

# 2. 運行監視模式
bun test --watch tests/Unit/

# 3. 檢查測試隔離性（mocks、setup）
```

### 錯誤：數據庫連接失敗

```bash
# 1. 檢查環境變數
cat .env | grep DB_

# 2. 驗證數據庫正在運行
# SQLite: ls -la database/database.sqlite
# PostgreSQL: psql -U app_user -h localhost -d gravito -c "SELECT 1"
# MySQL: mysql -h localhost -u app_user -p gravito -e "SELECT 1"

# 3. 查看詳細日誌
bun run dev 2>&1 | grep -i database
```

---

## 📖 重要文檔連結

| 文檔 | 用途 |
|------|------|
| [README.md](../README.md) | 專案概述和快速開始 |
| [SETUP.md](./SETUP.md) | 詳細的開發環境配置 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | DDD 架構詳解 |
| [ABSTRACTION_RULES.md](./ABSTRACTION_RULES.md) | 分層規則與 ACL 原則 |
| [ACL_ANTI_CORRUPTION_LAYER.md](./ACL_ANTI_CORRUPTION_LAYER.md) | ACL 設計與實施（詳細指南） |
| [MODULE_GUIDE.md](./MODULE_GUIDE.md) | 模組開發完整指南 |
| [MODULE_ADD_CHECKLIST.md](./MODULE_ADD_CHECKLIST.md) | 新增模組檢查清單 |
| [DATABASE.md](./DATABASE.md) | 資料庫操作和 Migration 指南 |
| [TESTING.md](./TESTING.md) | 測試策略和範例 |
| [API_GUIDELINES.md](./API_GUIDELINES.md) | API 設計規範 |
| [DEPENDENCY_INJECTION_ARCHITECTURE.md](./DEPENDENCY_INJECTION_ARCHITECTURE.md) | 依賴注入架構 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 常見問題解決 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 部署和生產配置 |

---

## 🔗 快速連結

- **Gravito 框架**: https://github.com/gravito-framework/gravito
- **DDD 資源**: https://domaindriven.org/
- **TypeScript**: https://www.typescriptlang.org/
- **Bun 文檔**: https://bun.sh/docs

---

## 💡 專業提示

### 加快開發速度

```bash
# 1. 使用 npm scripts 的簡寫
bun run dev          # 比 bun run --hot src/index.ts 短
bun run t            # 比 bun run typecheck 短（可配置別名）

# 2. 在 VS Code 中設置快鍵
# Command + B → bun run dev
# Command + T → bun run test --watch
```

### 改進開發體驗

```bash
# 1. 在新終端監視測試
bun test --watch

# 2. 在另一個終端開發
bun run dev

# 3. 使用 tmux 或 VS Code 分割終端
# - 終端 1: bun run dev
# - 終端 2: bun test --watch
# - 終端 3: git 操作
```

### 最佳實踐

1. **經常運行測試** - `bun test --watch`
2. **自動格式化** - 在 VS Code 中啟用 `formatOnSave`
3. **Type Safety** - 使用 `bun run typecheck` 檢查型別
4. **小的提交** - 經常提交小的、邏輯清晰的改動
5. **寫測試** - 先寫測試，再實現功能（TDD）

---

**最後更新**: 2024-03-10
**貢獻者**: Gravito Team

需要幫助？執行 `bun run troubleshoot` 或查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。
