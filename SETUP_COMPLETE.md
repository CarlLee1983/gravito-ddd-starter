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
