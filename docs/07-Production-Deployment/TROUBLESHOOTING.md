# 故障排查指南 (Troubleshooting Guide)

常見的開發問題和解決方案。

## 快速導航

- [安裝與啟動](#安裝與啟動)
- [數據庫問題](#數據庫問題)
- [路由與控制器](#路由與控制器)
- [測試失敗](#測試失敗)
- [性能和調試](#性能和調試)
- [模組創建](#模組創建)
- [生產部署](#生產部署)

---

## 安裝與啟動

### 問題: `bun install` 失敗 / node_modules 損壞

**症狀**:
```
error: Failed to resolve dependencies
error: Cannot find module '@gravito/core'
```

**解決方案**:

```bash
# 1. 清除快取
rm -rf node_modules bun.lockb

# 2. 重新安裝
bun install

# 3. 如果還是失敗，檢查 package.json
cat package.json | grep gravito

# 4. 確保使用 Bun 最新版本
bun upgrade
```

### 問題: 應用無法啟動 / "無法找到 PORT"

**症狀**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決方案**:

```bash
# 1. 檢查 PORT 環境變數
echo $PORT

# 2. 改用不同的 PORT
PORT=3001 bun run dev

# 3. 殺死佔用 PORT 的進程
lsof -i :3000           # 查看程序
kill -9 <PID>           # 殺死進程

# 4. 檢查 .env 配置
cat .env | grep PORT
```

### 問題: "Cannot find module @gravito/core"

**症狀**:
```
error: Cannot find module '@gravito/core'
```

**解決方案**:

```bash
# 1. 確認依賴已安裝
bun install

# 2. 檢查 package.json 中的依賴
cat package.json

# 3. 檢查 import 路徑是否正確
# ❌ 錯誤
import { PlanetCore } from '@gravito/core'

# ✅ 檢查你的 package.json 中 gravito 的實際包名

# 4. 清除快取重試
bun install --force
```

---

## 數據庫問題

### 問題: "Database file not found" / SQLite 無法建立

**症狀**:
```
Error: Cannot open database file at database/database.sqlite
```

**解決方案**:

```bash
# 1. 檢查目錄是否存在
ls -la database/

# 2. 建立 database 目錄
mkdir -p database

# 3. 檢查 ENABLE_DB 設置
cat .env | grep ENABLE_DB

# 4. 確保有寫入權限
touch database/database.sqlite

# 5. 重試啟動
bun run dev
```

### 問題: "無法連接到 PostgreSQL/MySQL"

**症狀**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: getaddrinfo ENOTFOUND db.example.com
```

**解決方案** (PostgreSQL):

```bash
# 1. 檢查 .env 配置
grep -A5 "DB_" .env

# 2. 驗證數據庫服務是否運行
psql -U postgres -h 127.0.0.1 -p 5432 -c "SELECT 1"

# 3. 確認 credentials 正確
# .env 應該有:
# DB_CONNECTION=postgres
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=gravito
# DB_USERNAME=postgres
# DB_PASSWORD=your_password

# 4. 如果使用 docker，確保容器運行
docker ps | grep postgres

# 5. 建立數據庫 (如果不存在)
createdb -U postgres gravito

# 6. 重試啟動
bun run dev
```

### 問題: "超時" 或 "查詢緩慢"

**症狀**:
```
Error: query timeout exceeded
或應用響應緩慢
```

**解決方案**:

```bash
# 1. 檢查數據庫連接池配置
# 編輯 config/database.ts

# 2. 增加查詢超時
// config/database.ts
DB_TIMEOUT=30000  // 增加超時 (毫秒)

# 3. 檢查慢查詢
# PostgreSQL
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

# MySQL
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

# 4. 添加索引 (手動管理，如需要)
# 這取決於你的數據庫和查詢

# 5. 啟用快取
# 編輯 .env
CACHE_DRIVER=redis  # 比 memory 更高效
```

---

## 路由與控制器

### 問題: "404 Not Found" / 端點無法訪問

**症狀**:
```
GET /api/users 404 Not Found
```

**解決方案**:

```bash
# 1. 檢查路由是否註冊
# 編輯 src/routes.ts，確認:
import { registerUserRoutes } from './Modules/User/Presentation/Routes/api'
await registerUserRoutes(core)

# 2. 檢查路由文件是否存在
ls -la src/Modules/User/Presentation/Routes/

# 3. 驗證應用已重啟
# 如果使用 bun run dev，應該看到:
# ✅ Routes registered

# 4. 測試健康檢查端點
curl http://localhost:3000/health

# 5. 檢查路由定義是否正確
# src/Modules/User/Presentation/Routes/api.ts 應該有:
export async function registerUserRoutes(core: PlanetCore) {
  const controller = new UserController(core)
  core.router.get('/api/users', (ctx) => controller.list(ctx))
  core.router.post('/api/users', (ctx) => controller.create(ctx))
}
```

### 問題: "方法不允許" (405 Method Not Allowed)

**症狀**:
```
POST /api/users 405 Method Not Allowed
```

**解決方案**:

```bash
# 1. 檢查路由中的 HTTP 方法
# ❌ 錯誤
core.router.get('/api/users', handler)  // 只支持 GET

# ✅ 正確
core.router.post('/api/users', handler)  // 支持 POST

# 2. 檢查請求中的 Content-Type
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# 3. 檢查路由文件是否有多個定義
# 避免重複定義相同的路由和方法
```

### 問題: 控制器中 ctx.get('db') 返回 undefined

**症狀**:
```
Error: Cannot read property 'table' of undefined
```

**解決方案**:

```bash
# 1. 檢查 ENABLE_DB 設置
cat .env | grep ENABLE_DB

# 2. 如果 ENABLE_DB=false，Database 不會加載
# 改為 ENABLE_DB=true 以啟用數據庫

# 3. 檢查 Orbit 配置
# config/orbits.ts 應該註冊 AtlasOrbit:
export const buildOrbits = (config: AppConfig) => [
  AtlasOrbit.create(config.database),
  // ...
]

# 4. 驗證控制器中的訪問方式
// ✅ 正確
const db = this.core.get('db')

// ❌ 錯誤
const db = ctx.db

# 5. 確認應用已完整初始化
# 在 src/bootstrap.ts 檢查 registerOrbits 調用
```

---

## 測試失敗

### 問題: `bun test` 失敗 / 測試無法運行

**症狀**:
```
error: Cannot find module '@/Modules/User'
error: Database connection timeout
```

**解決方案**:

```bash
# 1. 確認測試文件存在
ls -la tests/

# 2. 檢查 tsconfig.json 中的 paths 配置
cat tsconfig.json | grep paths -A5

# ✅ 應該有:
# "paths": {
#   "@/*": ["src/*"]
# }

# 3. 如果使用 SQLite，確認臨時數據庫不被鎖定
rm -f database/database.sqlite

# 4. 運行特定測試
bun test tests/Unit/Health/

# 5. 使用 verbose 模式查看詳細輸出
bun test --verbose

# 6. 檢查測試中的 import 路徑
// ❌ 錯誤
import { User } from '../Modules/User'

// ✅ 正確
import { User } from '@/Modules/User/Domain/Entities/User'
```

### 問題: "TypeError: Cannot read property 'table' of undefined" (測試)

**症狀**:
```
Error: Cannot read property 'table' of undefined
Repository 測試失敗
```

**解決方案**:

```typescript
// ✅ 正確的集成測試設置
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createApp } from '@/app'
import { PlanetCore } from '@gravito/core'

describe('UserRepository', () => {
  let core: PlanetCore

  beforeEach(async () => {
    // 為每個測試創建新的 app 實例
    core = await createApp()
  })

  afterEach(async () => {
    // 清理資源 (如果需要)
    // await core.close()
  })

  it('should find user by id', async () => {
    const db = core.get('db')
    const repository = new UserRepository(db)
    // 測試...
  })
})
```

### 問題: 測試超時

**症狀**:
```
test timed out after 5s
```

**解決方案**:

```typescript
// 增加超時時間
it('should perform long operation', async () => {
  // 測試邏輯
}, { timeout: 10000 })  // 10 秒超時

// 或全局設置
export default {
  timeout: 30000  // 30 秒全局超時
}
```

---

## 性能和調試

### 問題: 應用啟動緩慢

**症狀**:
```
等待超過 5 秒才看到 "Routes registered"
```

**解決方案**:

```bash
# 1. 檢查數據庫初始化
# 如果 ENABLE_DB=true 但數據庫損壞，會拖慢啟動
rm -f database/database.sqlite
bun run dev

# 2. 禁用不需要的 Orbits
# config/orbits.ts
export const buildOrbits = (config: AppConfig) => [
  // 只啟用必要的 Orbits
  AtlasOrbit.create(config.database),
  // 註釋掉暫時不用的
  // PlasmaOrbit.create(config.redis),
]

# 3. 使用 Redis 而不是內存快取
CACHE_DRIVER=redis

# 4. 檢查日誌級別
APP_DEBUG=false  # 減少日誌輸出

# 5. 使用 node 的 profiling 工具
node --prof src/index.ts
node --prof-process isolate-*.log > profile.txt
```

### 問題: 內存泄漏 / 應用消耗越來越多內存

**症狀**:
```
隨著時間推移，內存使用增長
應用最終崩潰或響應變慢
```

**解決方案**:

```bash
# 1. 檢查是否有未清理的事件監聽器
// ❌ 錯誤
router.on('request', handler)  // 如果沒有 off，會累積

// ✅ 正確
const listener = router.on('request', handler)
cleanup(() => router.off('request', listener))

# 2. 檢查數據庫連接是否正確關閉
// 確保 Repository 不保持打開的連接

# 3. 檢查快取是否有邊界
// 編輯 config/cache.ts，設置 TTL:
CACHE_DRIVER=redis
# Redis 會自動過期鍵

# 4. 監視進程內存使用
ps aux | grep bun
# 或使用任務管理器

# 5. 定期重啟應用 (臨時解決方案)
# 或在容器化環境中設置自動重啟
```

### 問題: "Cannot read property 'json' of undefined" (ctx 相關)

**症狀**:
```
Error: Cannot read property 'json' of undefined
或 "ctx is not defined"
```

**解決方案**:

```typescript
// ❌ 錯誤: ctx 沒有傳遞
const controller = new UserController(core)
controller.list()  // 缺少 ctx

// ✅ 正確: ctx 通過路由傳遞
core.router.get('/api/users', (ctx) => controller.list(ctx))

// ❌ 錯誤: ctx 方法名稱
ctx.json({ data })
ctx.send({ data })

// ✅ 正確
await ctx.json({ data })
```

---

## 模組創建

### 問題: 新模組沒有出現在路由中

**症狀**:
```
404 Not Found for /api/products
```

**解決方案**:

```bash
# 1. 檢查模組路由文件是否存在
ls -la src/Modules/Product/Presentation/Routes/

# 2. 在 src/routes.ts 中註冊路由
// ❌ 錯誤: 忘記導入
// import { registerProductRoutes } from './Modules/Product'

// ✅ 正確
import { registerProductRoutes } from './Modules/Product/Presentation/Routes'
export async function registerRoutes(core: PlanetCore) {
  // ...
  await registerProductRoutes(core)
}

# 3. 檢查路由函數名稱是否匹配
// ✅ 應該導出
export async function registerProductRoutes(core: PlanetCore) { ... }

# 4. 重啟應用
bun run dev

# 5. 驗證路由已註冊
# 應該看到: ✅ Routes registered
```

### 問題: 模組 Repository 無法訪問數據庫

**症狀**:
```
Error: Cannot read property 'table' of undefined (Repository)
```

**解決方案**:

```typescript
// ❌ 錯誤
export class ProductRepository implements IProductRepository {
  private db: any  // 沒有初始化

  async findAll() {
    this.db.table('products')  // db 是 undefined
  }
}

// ✅ 正確
export class ProductRepository implements IProductRepository {
  constructor(private db: any) {}

  async findAll() {
    return await this.db.table('products').select()
  }
}

// 在應用服務中正確注入
constructor(private core: PlanetCore) {
  const db = this.core.get('db')
  this.repository = new ProductRepository(db)
}
```

---

## 生產部署

### 問題: 生產環境中數據庫連接失敗

**症狀**:
```
Error: Cannot connect to database in production
ECONNREFUSED or ENOTFOUND
```

**解決方案**:

```bash
# 1. 檢查環境變數是否正確設置
printenv | grep DB_

# 2. 確認數據庫可從應用服務器訪問
# 如果使用雲服務，檢查:
# - 防火牆規則
# - 安全組
# - VPC 配置

# 3. 使用連接字符串而不是分散的變數
# .env 應該有完整的連接信息
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_DATABASE=gravito_prod
DB_USERNAME=app_user
DB_PASSWORD=secure_password

# 4. 測試連接
psql -U app_user -h prod-db.example.com -d gravito_prod

# 5. 檢查應用日誌
# 查看啟動時的錯誤訊息
tail -f /var/log/app.log

# 6. 確保有 .env 文件或環境變數
# 不要使用 .env.example，必須有實際的 .env
ls -la .env
```

### 問題: 生產環境中 Redis 無法連接

**症狀**:
```
Error: Redis connection refused
CACHE_DRIVER=redis 但 Redis 離線
```

**解決方案**:

```bash
# 1. 檢查 Redis 是否運行
redis-cli ping
# 應該返回 PONG

# 2. 如果是雲 Redis，檢查連接信息
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
REDIS_TLS=true

# 3. 測試連接
redis-cli -h prod-redis.example.com -p 6379 -a secure_password ping

# 4. 如果 Redis 不可用，回退到內存快取
CACHE_DRIVER=memory  # 臨時解決方案
# 或
CACHE_DRIVER=file    # 持久化的文件快取
```

### 問題: 應用在生產環境中崩潰 / SIGTERM 無法優雅關閉

**症狀**:
```
應用收到 SIGTERM 後立即崩潰
沒有時間清理連接
```

**解決方案**:

```typescript
// src/index.ts 中添加優雅關閉
const server = await bootstrap()

// 監聽關閉信號
process.on('SIGTERM', async () => {
  console.log('⏹️  Shutting down gracefully...')

  // 1. 停止接受新請求
  server.close(() => {
    console.log('✅ Server closed')
  })

  // 2. 關閉數據庫連接
  if (global.db) {
    await global.db.close()
  }

  // 3. 等待 30 秒後強制退出
  setTimeout(() => {
    console.error('❌ Shutdown timeout, forcing exit')
    process.exit(1)
  }, 30000)
})

process.on('SIGINT', () => {
  console.log('⚡ Interrupt received')
  process.exit(0)
})
```

### 問題: 部署後環境變數未被讀取

**症狀**:
```
應用使用默認值而不是環境變數
.env 文件不存在於部署環境
```

**解決方案**:

```bash
# 1. 確認 .env 文件在部署位置
# 不要將 .env 提交到 git
cat .gitignore | grep env
# 應該有: .env

# 2. 在部署時創建 .env 文件
# CI/CD 應該設置環境變數
# .github/workflows/deploy.yml:
- name: Create .env file
  run: |
    echo "APP_NAME=${{ secrets.APP_NAME }}" >> .env
    echo "DB_HOST=${{ secrets.DB_HOST }}" >> .env
    # ... 其他變數

# 3. 或使用實際的環境變數
# 不需要 .env 文件，直接設置 OS 環境變數
export APP_NAME=my-app
export DB_HOST=prod-db.com
bun run start

# 4. 驗證應用使用正確的配置
# 在啟動訊息中檢查
bun run dev 2>&1 | grep -E "APP_NAME|DB_"
```

---

## 還有其他問題?

如果你的問題不在此列表中:

1. **檢查日誌**: 查看完整的錯誤訊息
   ```bash
   bun run dev 2>&1 | tee debug.log
   ```

2. **隔離問題**: 創建最小重現例子
   ```bash
   # 創建簡單的測試文件
   touch test-issue.ts
   ```

3. **查看架構文檔**: 回到 ARCHITECTURE.md 和 MODULE_GUIDE.md

4. **檢查 Gravito 文檔**: https://github.com/gravito-framework/gravito

---

**祝你開發愉快! 如果有其他問題，歡迎提出。**
