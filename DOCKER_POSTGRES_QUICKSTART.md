# 🐘 Docker PostgreSQL + Redis 快速啟動卡

## ⚡ 一句話啟動

```bash
# 啟動 PostgreSQL 和 Redis + 運行應用
./scripts/docker-pg.sh start && ./scripts/run-with-postgres.sh dev
```

## 📋 常用命令速查

### Docker 服務管理 (PostgreSQL + Redis)

| 命令 | 說明 |
|------|------|
| `./scripts/docker-pg.sh start` | 啟動 PostgreSQL 和 Redis |
| `./scripts/docker-pg.sh stop` | 停止 PostgreSQL 和 Redis |
| `./scripts/docker-pg.sh restart` | 重啟 PostgreSQL 和 Redis |
| `./scripts/docker-pg.sh status` | 查看服務狀態和連接測試 |
| `./scripts/docker-pg.sh logs [service]` | 查看日誌（postgres\|redis\|all） |
| `./scripts/docker-pg.sh shell` | 進入 PostgreSQL CLI |
| `./scripts/docker-pg.sh redis` | 進入 Redis CLI |

### 應用運行

| 命令 | 說明 |
|------|------|
| `./scripts/run-with-postgres.sh dev` | 啟動開發伺服器 |
| `./scripts/run-with-postgres.sh test` | 運行測試套件 |
| `./scripts/run-with-postgres.sh shell` | 進入 PostgreSQL CLI |

### 快速檢查

```bash
# 檢查服務狀態和連接測試
./scripts/docker-pg.sh status

# 驗證 PostgreSQL 連接
docker-compose exec -T postgres psql -U postgres -d gravito_ddd -c "SELECT 1"

# 驗證 Redis 連接
docker-compose exec -T redis redis-cli ping

# 查看 PostgreSQL 日誌
./scripts/docker-pg.sh logs postgres

# 查看 Redis 日誌
./scripts/docker-pg.sh logs redis

# 查看所有日誌
./scripts/docker-pg.sh logs
```

## 🔑 連接信息

### PostgreSQL
```
Host:     localhost
Port:     5432
Database: gravito_ddd
User:     postgres
Password: postgres
```

### Redis (Docker)
```
Host:     localhost
Port:     6380
Database: 0
Password: (none)
```

**注意**: Docker Redis 映射到 6380 以避免與本地 Redis (6379) 衝突

## 📊 服務狀態檢查清單

- [ ] Docker 正在運行
- [ ] PostgreSQL 容器已啟動並健康 (`./scripts/docker-pg.sh status`)
- [ ] Redis 容器已啟動並健康 (`./scripts/docker-pg.sh status`)
- [ ] PostgreSQL 連接埠 5432 開放
- [ ] Redis 連接埠 6379 開放
- [ ] PostgreSQL 連接測試通過
- [ ] Redis PING 測試通過

## 🚨 快速故障排除

| 問題 | 解決方案 |
|------|--------|
| 容器無法啟動 | `docker-compose down -v && ./scripts/docker-pg.sh start` |
| 連接超時 | `./scripts/docker-pg.sh restart` |
| PostgreSQL 埠 5432 已被佔用 | `lsof -i :5432` 查看占用進程 |
| Redis 埠 6379 已被佔用 | `lsof -i :6379` 查看占用進程 |
| PostgreSQL 連接失敗 | `./scripts/docker-pg.sh logs postgres` 查看日誌 |
| Redis 連接失敗 | `./scripts/docker-pg.sh logs redis` 查看日誌 |
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
- **Redis 集成指南**: [docs/REDIS_INTEGRATION.md](docs/REDIS_INTEGRATION.md)
- **Redis 端口配置**: [REDIS_PORT_CONFIGURATION.md](REDIS_PORT_CONFIGURATION.md)
- **故障排除**: [POSTGRES_CONNECTION_FIX.md](POSTGRES_CONNECTION_FIX.md)
- **Atlas 配置**: [docs/ATLAS_POSTGRES_QUICK_START.md](docs/ATLAS_POSTGRES_QUICK_START.md)

## ✨ 當前狀態

✅ PostgreSQL 容器已啟動並健康
✅ Redis 容器已啟動並健康 (v7.4.7)
✅ PostgreSQL 連接已驗證成功
✅ Redis 連接已驗證成功 (PONG)
✅ 使用 Bun 原生 SQL 驅動（無需 pg 套件）
✅ Redis 通過 Gravito 框架自動配置
✅ API 端點正常工作
✅ 應用程式成功啟動並連接到 PostgreSQL

---

**快速開始**: `./scripts/docker-pg.sh start && ./scripts/run-with-postgres.sh dev`
