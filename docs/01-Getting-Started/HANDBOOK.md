> **Tier: 1 - 必需** | 預計 10 分鐘 | 新手入門 | ⭐⭐⭐

# 開發環境設置指南 (Setup Guide)

完整的開發環境配置步驟，支援 macOS、Linux 和 Windows。

## 前置需求

### 必需

- **Bun >= 1.0.0** - JavaScript 執行時和包管理器
  ```bash
  # 安裝 Bun
  curl -fsSL https://bun.sh/install | bash

  # 驗證安裝
  bun --version
  ```

- **Node.js >= 18.0.0** (可選，某些工具需要)
  ```bash
  bun install --global node  # 或使用 nvm
  ```

- **Git** - 版本控制
  ```bash
  git --version
  ```

### 推薦

- **Visual Studio Code** - 代碼編輯器
  - Extensions: TypeScript, Bun for VSCode

- **Postman** 或 **Insomnia** - API 測試工具

- **DBeaver** - 數據庫可視化管理

---

## 第 1 步: 克隆和安裝

### 1.1 克隆專案

```bash
# 使用 HTTPS
git clone https://github.com/gravito-framework/gravito-ddd-starter my-app
cd my-app

# 或使用 SSH (需要配置 SSH key)
git clone git@github.com:gravito-framework/gravito-ddd-starter.git my-app
cd my-app
```

### 1.2 安裝依賴

```bash
# 安裝所有依賴
bun install

# 驗證安裝成功
bun --version
bun pm ls  # 列出已安裝的包
```

**常見問題**:
- 如果 `bun install` 失敗，嘗試清除快取：
  ```bash
  rm -rf node_modules bun.lockb
  bun install
  ```

---

## 第 2 步: 環境配置

### 2.1 創建 .env 檔案

```bash
# 從範本複製
cp .env.example .env

# 編輯檔案
nano .env  # 或使用你的編輯器
```

### 2.2 開發環境配置 (建議)

編輯 `.env`，使用以下開發友好的設置：

```env
# 應用
APP_NAME=gravito-ddd-starter
APP_ENV=development
APP_DEBUG=true
PORT=3000
APP_URL=http://localhost:3000

# 數據庫 (SQLite 最簡單)
ENABLE_DB=true
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# 快取 (內存最快)
CACHE_DRIVER=memory

# Redis (開發時可選，使用內存快取)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# 郵件驗證
REQUIRE_EMAIL_VERIFICATION=false
```

### 2.3 生產環境配置

對於生產部署，使用真實的數據庫和服務：

```env
# 應用
APP_NAME=my-production-app
APP_ENV=production
APP_DEBUG=false
PORT=8080
APP_URL=https://api.example.com

# 數據庫 (使用 PostgreSQL)
ENABLE_DB=true
DB_CONNECTION=postgres
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_DATABASE=gravito_prod
DB_USERNAME=app_user
DB_PASSWORD=<secure_password>

# 快取 (使用 Redis)
CACHE_DRIVER=redis
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>
REDIS_TLS=true

# 郵件驗證 (如果需要)
REQUIRE_EMAIL_VERIFICATION=true
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@example.com
```

---

## 第 3 步: 本地數據庫設置

### 選項 A: SQLite (推薦用於開發)

SQLite 是最簡單的選擇，適合本地開發。

```bash
# 自動建立 (應用啟動時)
bun run dev

# 數據庫檔案位置
ls -la database/database.sqlite
```

**優點**:
- 零配置，無需額外服務
- 文件形式，易於備份
- 足夠快速的開發環境

**缺點**:
- 不適合多進程併發

### 選項 B: PostgreSQL (推薦用於生產)

如果想要更接近生產的環境，使用 PostgreSQL。

#### macOS (使用 Homebrew)

```bash
# 安裝 PostgreSQL
brew install postgresql@15

# 啟動服務
brew services start postgresql@15

# 驗證安裝
psql --version
```

#### Ubuntu/Debian

```bash
# 安裝 PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# 啟動服務
sudo systemctl start postgresql

# 驗證安裝
psql --version
```

#### Docker (所有平台)

```bash
# 拉取 PostgreSQL 鏡像
docker pull postgres:15

# 運行容器
docker run --name gravito-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=gravito \
  -p 5432:5432 \
  -d postgres:15

# 驗證運行
docker ps | grep postgres
```

#### 建立數據庫和用戶

```bash
# 連接到 PostgreSQL
psql -U postgres -h 127.0.0.1

# 在 PostgreSQL 終端中執行
CREATE DATABASE gravito;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE gravito TO app_user;
\q  # 退出
```

#### 更新 .env

```env
DB_CONNECTION=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gravito
DB_USERNAME=app_user
DB_PASSWORD=secure_password
```

#### 測試連接

```bash
psql -U app_user -h 127.0.0.1 -d gravito -c "SELECT 1"
# 應該返回: 1
```

### 選項 C: MySQL

類似 PostgreSQL，但使用 MySQL。

#### Docker

```bash
docker run --name gravito-mysql \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=gravito \
  -p 3306:3306 \
  -d mysql:8.0

# 建立用戶
docker exec -it gravito-mysql mysql -u root -p
# 輸入密碼: root_password

# 在 MySQL 終端
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON gravito.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

#### 更新 .env

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gravito
DB_USERNAME=app_user
DB_PASSWORD=secure_password
```

---

## 第 4 步: Redis 設置 (可選)

只有在使用 `CACHE_DRIVER=redis` 時才需要。

### Docker (推薦)

```bash
# 拉取 Redis 鏡像
docker pull redis:7

# 運行容器
docker run --name gravito-redis \
  -p 6379:6379 \
  -d redis:7

# 驗證運行
docker ps | grep redis

# 測試連接
redis-cli ping
# 應該返回: PONG
```

### macOS (Homebrew)

```bash
# 安裝 Redis
brew install redis

# 啟動服務
brew services start redis

# 測試連接
redis-cli ping
```

### Ubuntu/Debian

```bash
# 安裝 Redis
sudo apt update
sudo apt install redis-server

# 啟動服務
sudo systemctl start redis-server

# 測試連接
redis-cli ping
```

### 更新 .env

```env
CACHE_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=  # 如果沒有密碼留空
```

---

## 第 5 步: 驗證設置

### 5.1 檢查所有依賴

```bash
# 驗證 Bun
bun --version

# 驗證數據庫連接
# SQLite
ls -la database/database.sqlite

# PostgreSQL
psql -U app_user -h 127.0.0.1 -d gravito -c "SELECT 1"

# 驗證 Redis (如果使用)
redis-cli ping
```

### 5.2 啟動應用

```bash
# 開發模式 (熱重載)
bun run dev

# 應該看到:
# ✨ Server started successfully!
# 📍 Base URL:       http://localhost:3000
# ✅ Routes registered
```

### 5.3 測試 API

```bash
# 健康檢查
curl http://localhost:3000/health

# 應該返回:
# {"success":true,"status":"healthy","timestamp":"2024-03-10T..."}
```

---

## 第 6 步: IDE 和工具設置

### VS Code 推薦設置

#### 安裝擴展

```bash
code --install-extension biomejs.biome
code --install-extension oven.bun-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

#### .vscode/settings.json

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "search.exclude": {
    "node_modules": true,
    "bun.lockb": true,
    "dist": true
  },
  "files.watcherExclude": {
    "node_modules": true,
    ".git": true
  }
}
```

### 命令行工具

```bash
# Git 配置
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 啟用 Git hooks (可選)
# 參考: docs/GIT_HOOKS.md
```

---

## 第 7 步: 日常開發工作流程

### 啟動應用

```bash
# 開發模式 (推薦)
bun run dev

# 生產模式
bun run build
bun run start
```

### 運行測試

```bash
# 運行所有測試
bun test

# 運行特定測試
bun test tests/Unit/

# 監視模式 (檔案更改時自動運行)
bun test --watch
```

### 代碼格式化和 Linting

```bash
# 檢查代碼風格
bun run lint

# 自動修復
bun run format
```

### 創建新模組

```bash
# 安裝 CLI
bun add -D @gravito/pulse

# 生成新模組
bun gravito module generate Product --ddd-type simple
```

---

## 故障排查

### 問題: Port 3000 已被佔用

```bash
# 檢查佔用進程
lsof -i :3000

# 殺死進程
kill -9 <PID>

# 或使用不同的 PORT
PORT=3001 bun run dev
```

### 問題: 數據庫連接失敗

```bash
# 檢查 .env 配置
cat .env | grep DB_

# 測試連接 (PostgreSQL)
psql -U app_user -h 127.0.0.1 -d gravito

# 檢查數據庫是否運行
docker ps  # 檢查容器

# 檢查日誌
bun run dev 2>&1 | grep -i database
```

### 問題: 模組找不到

```bash
# 確認依賴已安裝
bun install

# 清除快取
rm -rf node_modules bun.lockb
bun install

# 驗證 tsconfig.json paths
cat tsconfig.json | grep -A5 paths
```

### 更多問題

參見 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Docker Compose (完整環境)

如果想要一鍵啟動所有服務，使用 Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_CONNECTION=postgres
      - DB_HOST=postgres
      - DB_DATABASE=gravito
      - CACHE_DRIVER=redis
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=gravito
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

運行:
```bash
docker-compose up
```

---

## 下一步

1. 閱讀 [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解系統架構
2. 閱讀 [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 學習創建模組
3. 檢查 [API_GUIDELINES.md](./API_GUIDELINES.md) - API 設計規範
4. 開始開發你的模組！

---

**祝你開發愉快！如有問題，參考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。**
> **Tier: 1 - 必需** | 預計 5 分鐘 | 常用指令速查 | ⭐⭐⭐

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
# 1. 定義 Port（Post/Domain/Services/）
# src/Modules/Post/Domain/Services/IAuthorService.ts
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
# ✅ Docker PostgreSQL 設置完成

## 🎉 已完成事項

### 1️⃣ Docker PostgreSQL 環境
- ✅ Docker Compose 配置完成
- ✅ PostgreSQL 15 (Alpine) 容器已創建
- ✅ 服務狀態: **健康 (healthy)**
- ✅ 監聽埠: **5432**
- ✅ 數據卷持久化已配置

### 2️⃣ 服務管理工具
- ✅ `scripts/docker-pg.sh` - 完整服務管理腳本
  - 啟動、停止、重啟服務
  - 查看狀態和日誌
  - 進入 PostgreSQL CLI

- ✅ `scripts/run-with-postgres.sh` - 應用快速啟動腳本
  - 自動連接驗證
  - 一鍵啟動開發環境

### 3️⃣ 配置文件
- ✅ `.env.postgres` - PostgreSQL 環境變數預設配置
- ✅ `docker-compose.yml` - 完整服務定義
- ✅ `scripts/init-db.sql` - 初始化腳本

### 4️⃣ 文檔
- ✅ `DOCKER_POSTGRES_QUICKSTART.md` - 快速參考卡
- ✅ `docs/DOCKER_POSTGRES_SETUP.md` - 完整設置指南
- ✅ `POSTGRES_CONNECTION_FIX.md` - 故障排除指南

### 5️⃣ 驗證
- ✅ PostgreSQL 連接已測試 ✓
- ✅ Atlas ping 測試通過 ✓
- ✅ 數據庫查詢已驗證 ✓

## 🚀 立即使用

### 快速開始（推薦）

```bash
# 方式 1：一行命令啟動
./scripts/docker-pg.sh start && ./scripts/run-with-postgres.sh dev

# 方式 2：分步啟動
./scripts/docker-pg.sh start
./scripts/run-with-postgres.sh dev
```

### 常用命令

```bash
# 啟動服務
./scripts/docker-pg.sh start

# 查看狀態
./scripts/docker-pg.sh status

# 運行應用
./scripts/run-with-postgres.sh dev

# 運行測試
./scripts/run-with-postgres.sh test

# 進入 PostgreSQL
./scripts/docker-pg.sh shell

# 停止服務
./scripts/docker-pg.sh stop
```

## 📊 服務信息

| 項目 | 值 |
|------|-----|
| **容器名** | gravito-postgres |
| **鏡像** | postgres:15-alpine |
| **主機** | localhost |
| **埠** | 5432 |
| **數據庫** | gravito_ddd |
| **用戶名** | postgres |
| **密碼** | postgres |
| **狀態** | ✅ 健康 (healthy) |

## 📁 項目結構

```
gravito-ddd/
├── docker-compose.yml           # Docker 服務定義
├── .env.postgres                # PostgreSQL 環境配置
├── DOCKER_POSTGRES_QUICKSTART.md # 快速啟動卡
├── POSTGRES_CONNECTION_FIX.md    # 故障排除
├── docs/
│   └── DOCKER_POSTGRES_SETUP.md # 完整設置指南
└── scripts/
    ├── docker-pg.sh             # 服務管理工具
    ├── run-with-postgres.sh     # 應用啟動腳本
    └── init-db.sql              # 數據庫初始化
```

## 🔄 工作流程

### 1. 開發流程

```bash
# 啟動 PostgreSQL
./scripts/docker-pg.sh start

# 運行應用
./scripts/run-with-postgres.sh dev

# 應用會在 http://localhost:3000 運行
# PostgreSQL 監聽在 localhost:5432
```

### 2. 測試流程

```bash
# 啟動 PostgreSQL
./scripts/docker-pg.sh start

# 運行測試
./scripts/run-with-postgres.sh test

# 所有測試將使用 PostgreSQL 數據庫
```

### 3. 調試流程

```bash
# 進入 PostgreSQL CLI
./scripts/docker-pg.sh shell

# 執行 SQL 查詢
SELECT * FROM information_schema.tables;

# 查看應用日誌
./scripts/docker-pg.sh logs
```

## 💡 智能提示

### 環境變數自動加載
`run-with-postgres.sh` 會自動：
- 加載 `.env.postgres` 環境變數
- 驗證 PostgreSQL 連接
- 檢查容器健康狀態
- 自動重啟不健康的服務

### 數據持久化
- 所有 PostgreSQL 數據儲存在 `gravito_postgres_data` 數據卷中
- 停止容器後數據仍會保留
- 需要清除數據時: `docker-compose down -v`

### 跨平台兼容
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (Ubuntu, Debian, etc.)
- ✅ Windows (WSL2)

## ⚠️ 常見問題

**Q: 如何切換回 SQLite？**
```bash
export DB_CONNECTION=sqlite
export ENABLE_DB=true
bun dev
```

**Q: PostgreSQL 無法連接？**
```bash
# 重啟服務
./scripts/docker-pg.sh restart

# 檢查狀態
./scripts/docker-pg.sh status

# 查看日誌
./scripts/docker-pg.sh logs
```

**Q: 如何清除所有數據重新開始？**
```bash
./scripts/docker-pg.sh stop
docker-compose down -v
./scripts/docker-pg.sh start
```

## 📚 相關文檔

- [快速啟動卡](DOCKER_POSTGRES_QUICKSTART.md)
- [完整設置指南](docs/DOCKER_POSTGRES_SETUP.md)
- [故障排除指南](POSTGRES_CONNECTION_FIX.md)
- [Atlas PostgreSQL 配置](docs/ATLAS_POSTGRES_QUICK_START.md)

## ✨ 下一步

1. **啟動開發環境**
   ```bash
   ./scripts/docker-pg.sh start
   ./scripts/run-with-postgres.sh dev
   ```

2. **運行數據庫遷移**（如需要）
   ```bash
   bun run migrate
   ```

3. **開始開發**
   - 訪問應用: http://localhost:3000
   - 開發代碼
   - 應用自動重新加載

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: your feature"
   ```

---

**🎉 一切就緒！開始使用 PostgreSQL 進行開發吧！**

**快速命令**: `./scripts/docker-pg.sh start && ./scripts/run-with-postgres.sh dev`
