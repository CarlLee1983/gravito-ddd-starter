# Atlas PostgreSQL 快速開始

## 📋 當前狀態

✅ **Atlas 已成功集成**
- 驅動: `@gravito/atlas` v2.4.0
- 支持: PostgreSQL、MySQL、SQLite
- 狀態: 編譯通過，282 個測試通過

❌ **PostgreSQL 連接問題**
- 本機未運行 PostgreSQL 服務
- 需要配置或使用替代方案

## 🚀 選項 1：快速開發（SQLite）

```bash
export DB_CONNECTION=sqlite
export ENABLE_DB=true
bun dev
```

✅ **優點**: 無需額外設置，即插即用
❌ **缺點**: SQLite 功能有限

## 🐘 選項 2：使用 Docker PostgreSQL（推薦）

```bash
# 1. 啟動 PostgreSQL 容器
docker run --name gravito-postgres \
  -e POSTGRES_DB=gravito_ddd \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# 2. 等待啟動
sleep 5

# 3. 運行應用
export DB_CONNECTION=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_DATABASE=gravito_ddd
export DB_USER=postgres
export DB_PASSWORD=postgres
export ENABLE_DB=true
bun dev

# 4. 停止服務
docker stop gravito-postgres
docker rm gravito-postgres
```

✅ **優點**: 完整的 PostgreSQL 環境，易於清理
✅ **優點**: 跨平台支持（macOS、Linux、Windows）

## 💻 選項 3：本機 PostgreSQL

### macOS
```bash
# 使用 Homebrew
brew install postgresql@15
brew services start postgresql@15

# 設置環境變數
export DB_CONNECTION=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_DATABASE=gravito_ddd
export DB_USER=postgres
export DB_PASSWORD=
export ENABLE_DB=true

bun dev
```

### Linux (Ubuntu/Debian)
```bash
# 安裝
sudo apt-get install postgresql-15

# 啟動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 創建數據庫
sudo -u postgres createdb gravito_ddd

# 設置環境變數並運行應用
export DB_CONNECTION=postgres
bun dev
```

## 🔍 診斷命令

### 檢查 PostgreSQL 狀態

```bash
# 查看運行的 PostgreSQL 進程
ps aux | grep postgres

# 檢查監聽的埠
lsof -i :5432

# 測試連接
psql -h localhost -U postgres -d gravito_ddd -c "SELECT 1"
```

### 檢查連接配置

```bash
# 查看當前環境設定
echo "DB_CONNECTION=${DB_CONNECTION:-sqlite}"
echo "DB_HOST=${DB_HOST:-127.0.0.1}"
echo "DB_PORT=${DB_PORT:-5432}"
echo "DB_DATABASE=${DB_DATABASE:-gravito_ddd}"
echo "DB_USER=${DB_USER:-postgres}"
```

### 運行連接測試

```bash
# SQLite（應該成功）
DB_CONNECTION=sqlite ENABLE_DB=true bun run test-atlas-connection.ts

# PostgreSQL（需要伺服器運行）
DB_CONNECTION=postgres DB_HOST=localhost ENABLE_DB=true bun run test-atlas-connection.ts
```

## 🧪 運行測試

```bash
# 所有測試
bun test

# 資料庫相關測試
bun test tests/Integration/

# 單個文件
bun test tests/Unit/Modules/User/
```

## ⚙️ 環境變數參考

### 必需
- `DB_CONNECTION`: 驅動類型 (`sqlite`, `postgres`, `mysql`)
- `ENABLE_DB`: 啟用資料庫 (`true` 或 `false`)

### PostgreSQL 配置
- `DB_HOST`: 主機地址（預設: 127.0.0.1）
- `DB_PORT`: 埠號（預設: 5432）
- `DB_DATABASE`: 資料庫名稱（預設: gravito_ddd）
- `DB_USER`: 用戶名（預設: postgres）
- `DB_PASSWORD`: 密碼

### 連接池（可選）
- `DB_POOL_MIN`: 最小連接數
- `DB_POOL_MAX`: 最大連接數
- `DB_POOL_IDLE_TIMEOUT`: 空閒超時時間（ms）
- `DB_POOL_CONNECTION_TIMEOUT`: 連接超時時間（ms）

## 📚 更多信息

詳見 [POSTGRES_CONNECTION_FIX.md](../POSTGRES_CONNECTION_FIX.md)

## ❓ 常見問題

**Q: 為什麼 ping 測試失敗？**
A: PostgreSQL 伺服器未運行。檢查 `ps aux | grep postgres` 或查看 Docker 容器狀態。

**Q: 連接超時怎麼辦？**
A: 檢查主機和埠配置。如果使用 Docker，確保 `-p 5432:5432` 參數正確。

**Q: 可以混合使用 SQLite 和 PostgreSQL 嗎？**
A: 可以，但需要分別配置。建議在開發時使用一個固定的資料庫。

---

**最後更新**: 2026-03-12
