# PostgreSQL 連接故障排除指南

## 問題診斷結果

### 當前狀態
- ✅ Atlas 模組正確加載
- ✅ PostgreSQL 驅動已安裝（postgres ^3.4.8）
- ✅ 連接配置可成功添加到 Atlas
- ❌ 實際連接失敗：「Could not connect to PostgreSQL」

### 根本原因
連接失敗有以下可能原因（按優先級排列）：

1. **PostgreSQL 伺服器未運行**（最可能）
   - PostgreSQL 服務未啟動
   - 監聽在不同的主機或埠

2. **連接配置不正確**
   - 主機地址錯誤
   - 埠號錯誤
   - 用戶名或密碼不正確
   - 資料庫不存在

3. **防火牆或網路問題**
   - PostgreSQL 監聽在 localhost 而非所有介面
   - 防火牆阻止連接

## 快速檢查步驟

### 1. 檢查 PostgreSQL 是否運行

```bash
# macOS
brew services list | grep postgres

# Linux
sudo systemctl status postgresql

# 或直接嘗試連接
psql -h 127.0.0.1 -U postgres -d postgres -c "SELECT 1"
```

### 2. 檢查連接參數

```bash
# 查看 PostgreSQL 監聽的地址和埠
sudo netstat -tln | grep 5432
# 或
lsof -i :5432
```

### 3. 驗證環境變數

```bash
# 檢查應用程式使用的配置
echo "DB_CONNECTION=${DB_CONNECTION:-sqlite}"
echo "DB_HOST=${DB_HOST:-127.0.0.1}"
echo "DB_PORT=${DB_PORT:-5432}"
echo "DB_DATABASE=${DB_DATABASE:-gravito_ddd}"
echo "DB_USER=${DB_USER:-postgres}"
```

## 解決方案

### 方案 A：啟動 PostgreSQL（推薦用於開發）

#### macOS
```bash
# 使用 Homebrew
brew services start postgresql@15

# 或
brew services start postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Docker
```bash
docker run --name gravito-postgres \
  -e POSTGRES_DB=gravito_ddd \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgres:15
```

### 方案 B：使用 SQLite（適合開發環境）

如果暫時無法使用 PostgreSQL，可以使用 SQLite：

```bash
# 運行應用
export DB_CONNECTION=sqlite
export ENABLE_DB=true
bun dev
```

### 方案 C：修改連接配置

如果 PostgreSQL 運行在不同的位置，更新環境變數：

```bash
export DB_CONNECTION=postgres
export DB_HOST=your-pg-host
export DB_PORT=5432
export DB_DATABASE=gravito_ddd
export DB_USER=postgres
export DB_PASSWORD=yourpassword
bun dev
```

## 改進建議

### 改進 1：增強連接錯誤消息

修改 `GravitoDatabaseAdapter.ts`，提供更詳細的連接診斷信息：

```typescript
export function createGravitoDatabaseConnectivityCheck(): IDatabaseConnectivityCheck {
	initializeAtlasConnection()

	return {
		async ping(): Promise<boolean> {
			try {
				const DB = getDB()
				if (!DB) {
					console.warn('⚠️ [Atlas] DB 實例未初始化')
					return false
				}

				// 先檢查配置是否存在
				const connConfig = process.env.DB_CONNECTION || 'sqlite'
				if (connConfig === 'postgres') {
					console.log(`📍 [Atlas] 嘗試連接 PostgreSQL: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 5432}/${process.env.DB_DATABASE || 'gravito_ddd'}`)
				}

				await DB.table('sqlite_master').limit(1).select()
				return true
			} catch (error) {
				const connConfig = process.env.DB_CONNECTION || 'sqlite'
				if (connConfig === 'postgres') {
					console.error(`❌ [Atlas] PostgreSQL 連接失敗`)
					console.error(`   - 主機: ${process.env.DB_HOST || '127.0.0.1'}`)
					console.error(`   - 埠: ${process.env.DB_PORT || 5432}`)
					console.error(`   - 資料庫: ${process.env.DB_DATABASE || 'gravito_ddd'}`)
					console.error(`   - 用戶: ${process.env.DB_USER || 'postgres'}`)
					console.error(`   - 錯誤: ${error instanceof Error ? error.message : String(error)}`)
					console.error(`\n   💡 快速修復：`)
					console.error(`      1. 確認 PostgreSQL 運行: brew services list | grep postgres`)
					console.error(`      2. 檢查連接埠: lsof -i :5432`)
					console.error(`      3. 測試連接: psql -h 127.0.0.1 -U postgres`)
				}
				return false
			}
		},
	}
}
```

### 改進 2：添加連接重試邏輯

```typescript
export function createAtlasDatabaseAccess(): IDatabaseAccess {
	initializeAtlasConnection()

	return new AtlasDatabaseAccessWithRetry()
}

class AtlasDatabaseAccessWithRetry implements IDatabaseAccess {
	private maxRetries = 3
	private retryDelay = 1000

	async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))
				if (attempt < this.maxRetries) {
					console.warn(`⚠️ [Atlas] 第 ${attempt} 次嘗試失敗，${this.retryDelay}ms 後重試...`)
					await new Promise(resolve => setTimeout(resolve, this.retryDelay))
				}
			}
		}

		throw lastError || new Error('操作失敗')
	}

	table(name: string): IQueryBuilder {
		return new AtlasQueryBuilder(name)
	}
}
```

### 改進 3：支持連接池配置

在 `.env` 中添加連接池配置選項：

```env
# PostgreSQL 連接池
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=5000
```

## 驗證步驟

### 運行診斷測試

```bash
# SQLite（應該成功）
DB_CONNECTION=sqlite ENABLE_DB=true bun run test-atlas-connection.ts

# PostgreSQL（需要伺服器運行）
DB_CONNECTION=postgres bun run test-atlas-connection.ts
```

### 運行單元測試

```bash
# 運行所有測試
bun test

# 只運行數據庫相關測試
bun test tests/Integration/repositories/
```

## 常見錯誤及解決

| 錯誤訊息 | 原因 | 解決方案 |
|--------|------|--------|
| `Could not connect to PostgreSQL` | PostgreSQL 伺服器未運行 | 啟動 PostgreSQL |
| `ECONNREFUSED 127.0.0.1:5432` | 連接被拒絕 | 檢查主機和埠號 |
| `authentication failed` | 用戶名或密碼錯誤 | 驗證 DB_USER 和 DB_PASSWORD |
| `database "gravito_ddd" does not exist` | 資料庫不存在 | 建立資料庫 |
| `connect ENOTFOUND` | 主機名無法解析 | 檢查 DB_HOST 配置 |

## 開發工作流

### 推薦：使用 Docker PostgreSQL

```bash
# 1. 啟動 PostgreSQL 容器
docker run --name gravito-pg \
  -e POSTGRES_DB=gravito_ddd \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# 2. 等待啟動
sleep 5

# 3. 運行遷移
bun run migrate

# 4. 啟動應用
bun dev
```

### 停止服務

```bash
docker stop gravito-pg
docker rm gravito-pg
```

## 參考資源

- [Atlas 官方文檔](https://gravito-framework.github.io/atlas)
- [PostgreSQL 官方文檔](https://www.postgresql.org/docs)
- [pg 驅動文檔](https://node-postgres.com)

---

**最後更新**: 2026-03-12
