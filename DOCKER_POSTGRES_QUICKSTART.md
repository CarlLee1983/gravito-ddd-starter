# 🐘 Docker PostgreSQL 快速啟動卡

## ⚡ 一句話啟動

```bash
# 啟動 PostgreSQL + 運行應用
./scripts/docker-pg.sh start && ./scripts/run-with-postgres.sh dev
```

## 📋 常用命令速查

### PostgreSQL 服務管理

| 命令 | 說明 |
|------|------|
| `./scripts/docker-pg.sh start` | 啟動 PostgreSQL |
| `./scripts/docker-pg.sh stop` | 停止 PostgreSQL |
| `./scripts/docker-pg.sh restart` | 重啟 PostgreSQL |
| `./scripts/docker-pg.sh status` | 查看服務狀態 |
| `./scripts/docker-pg.sh logs` | 查看日誌 |
| `./scripts/docker-pg.sh shell` | 進入 PostgreSQL CLI |

### 應用運行

| 命令 | 說明 |
|------|------|
| `./scripts/run-with-postgres.sh dev` | 啟動開發伺服器 |
| `./scripts/run-with-postgres.sh test` | 運行測試套件 |
| `./scripts/run-with-postgres.sh shell` | 進入 PostgreSQL CLI |

### 快速檢查

```bash
# 檢查服務狀態
./scripts/docker-pg.sh status

# 驗證連接
docker-compose exec -T postgres psql -U postgres -d gravito_ddd -c "SELECT 1"

# 查看容器日誌
docker-compose logs postgres
```

## 🔑 連接信息

```
Host:     localhost
Port:     5432
Database: gravito_ddd
User:     postgres
Password: postgres
```

## 📊 服務狀態檢查清單

- [ ] Docker 正在運行
- [ ] PostgreSQL 容器已啟動 (`./scripts/docker-pg.sh status`)
- [ ] 健康狀態為 `healthy`
- [ ] 連接埠 5432 開放
- [ ] Atlas ping 測試通過

## 🚨 快速故障排除

| 問題 | 解決方案 |
|------|--------|
| 容器無法啟動 | `docker-compose down -v && ./scripts/docker-pg.sh start` |
| 連接超時 | `./scripts/docker-pg.sh restart` |
| 埠已被佔用 | `lsof -i :5432` 查看占用進程 |
| 數據丟失 | 數據卷已持久化，除非執行 `docker-compose down -v` |

## 💡 工作流程

### 開發環境設置

```bash
# 1. 啟動 PostgreSQL
./scripts/docker-pg.sh start

# 2. 等待就緒（通常 10-15 秒）
sleep 15

# 3. 運行應用
./scripts/run-with-postgres.sh dev
```

### 測試

```bash
# 1. 確保 PostgreSQL 運行中
./scripts/docker-pg.sh status

# 2. 運行測試
./scripts/run-with-postgres.sh test
```

### 數據庫操作

```bash
# 進入 PostgreSQL CLI
./scripts/docker-pg.sh shell

# 執行 SQL
psql -h localhost -U postgres -d gravito_ddd -c "SELECT * FROM users;"
```

## 📚 詳細文檔

- **完整設置指南**: [docs/DOCKER_POSTGRES_SETUP.md](docs/DOCKER_POSTGRES_SETUP.md)
- **故障排除**: [POSTGRES_CONNECTION_FIX.md](POSTGRES_CONNECTION_FIX.md)
- **Atlas 配置**: [docs/ATLAS_POSTGRES_QUICK_START.md](docs/ATLAS_POSTGRES_QUICK_START.md)

## ✨ 當前狀態

✅ PostgreSQL 容器已啟動並健康
✅ 連接已驗證成功
✅ Atlas ping 測試通過
✅ 數據庫查詢已驗證
✅ 使用 Bun 原生 SQL 驅動（無需 pg 套件）
✅ API 端點正常工作

---

**快速開始**: `./scripts/docker-pg.sh start && ./scripts/run-with-postgres.sh dev`
