# 部署指南 (Deployment Guide)

此文檔說明如何在各種環境中部署 Gravito DDD Starter 應用程式。

## 目錄

- [前置需求](#前置需求)
- [本地建置](#本地建置)
- [環境設定](#環境設定)
- [部署至 Docker](#部署至-docker)
- [部署至 Fly.io](#部署至-flyio)
- [部署至 Railway](#部署至-railway)
- [部署至 VPS](#部署至-vps)
- [健康檢查](#健康檢查)
- [監控與日誌](#監控與日誌)

---

## 前置需求

### 基本需求

- **Bun** >= 1.0.0（用於構建和運行應用程式）
  ```bash
  # 檢查 Bun 版本
  bun --version
  ```

- **Git** >= 2.20.0（用於版本控制）

### 可選需求

- **Docker** >= 20.10（用於容器化部署）
- **Docker Compose** >= 1.29（用於本地開發環境）

---

## 本地建置

### 1. 開發模式

開發模式啟用熱重載和詳細日誌：

```bash
# 複製環境設定檔
cp .env.example .env

# 安裝依賴
bun install

# 啟動開發伺服器
bun run dev
```

開發伺服器將在 `http://localhost:3000` 啟動。

### 2. 正式環境建置

正式環境構建會產生優化的 JavaScript 束：

```bash
# 構建應用程式
bun run build

# 檢查輸出
ls -lh dist/

# 測試構建
bun run start
```

正式環境伺服器將在 `http://localhost:3000` 啟動。

### 3. 驗證構建

```bash
# 執行完整檢查（類型檢查 + lint + 測試）
bun run check

# 或個別執行
bun run typecheck    # TypeScript 類型檢查
bun run lint         # 程式碼風格檢查
bun run test         # 執行測試套件
```

---

## 環境設定

### 開發環境 (.env.development)

```env
# 伺服器設定
PORT=3000
APP_NAME=gravito-ddd-app
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000

# 資料庫設定（可選）
ENABLE_DB=true
DB_CONNECTION=sqlite
DB_DATABASE=database/development.sqlite

# 快取設定
CACHE_DRIVER=memory
```

### 測試環境 (.env.test)

```env
PORT=3001
APP_ENV=test
APP_DEBUG=false
ENABLE_DB=true
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
CACHE_DRIVER=memory
```

### 正式環境 (.env.production)

```env
# 伺服器設定
PORT=3000
APP_NAME=gravito-ddd-app
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# 資料庫設定（需設定）
ENABLE_DB=true
DB_CONNECTION=postgres
DB_HOST=db.example.com
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=secure_password_here
DB_DATABASE=app_production

# 快取設定
CACHE_DRIVER=redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password

# 應用程式安全
APP_KEY=your-base64-encoded-key-here
```

**⚠️ 安全提醒**：
- 永遠使用環境變數管理敏感資訊（密碼、API 金鑰）
- 永遠不要將 `.env` 檔案提交到 Git
- 使用強密碼和 HTTPS 在正式環境

---

## 部署至 Docker

### Dockerfile

```dockerfile
FROM oven/bun:latest

WORKDIR /app

# 複製依賴檔案
COPY package.json bun.lockb* ./

# 安裝依賴
RUN bun install --frozen-lockfile

# 複製應用程式程式碼
COPY . .

# 構建應用程式
RUN bun run build

# 暴露埠口
EXPOSE 3000

# 啟動應用程式
CMD ["bun", "run", "start"]
```

### 構建和運行

```bash
# 構建映像
docker build -t gravito-ddd-app:latest .

# 運行容器（開發）
docker run -p 3000:3000 \
  -e APP_ENV=development \
  -e APP_DEBUG=true \
  gravito-ddd-app:latest

# 運行容器（正式環境）
docker run -p 3000:3000 \
  -e APP_ENV=production \
  -e APP_DEBUG=false \
  -e DB_HOST=db.example.com \
  -e DB_PASSWORD=secure_password \
  gravito-ddd-app:latest
```

### Docker Compose（本地開發）

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      APP_ENV: development
      APP_DEBUG: "true"
      ENABLE_DB: "true"
      DB_CONNECTION: postgres
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: app_user
      DB_PASSWORD: app_password
      DB_DATABASE: app_dev
      CACHE_DRIVER: redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: bun run dev

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_password
      POSTGRES_DB: app_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

啟動完整開發棧：

```bash
docker-compose up -d

# 檢查日誌
docker-compose logs -f app

# 停止服務
docker-compose down
```

---

## 部署至 Fly.io

### 1. 安裝 Fly CLI

```bash
# macOS
curl -L https://fly.io/install.sh | sh

# 或使用 Homebrew
brew install flyctl
```

### 2. 設定 Fly 應用程式

```bash
# 登入 Fly
fly auth login

# 建立新應用程式
fly apps create gravito-ddd-app

# 設定應用程式
fly deploy
```

### 3. Fly 設定檔 (fly.toml)

```toml
app = "gravito-ddd-app"
primary_region = "tpe"  # 台灣

[build]
  dockerfile = "Dockerfile"

[env]
  APP_ENV = "production"
  APP_DEBUG = "false"
  ENABLE_DB = "true"
  DB_CONNECTION = "postgres"
  CACHE_DRIVER = "redis"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [services.ports]
    port = 80
    handlers = ["http"]

  [services.ports]
    port = 443
    handlers = ["tls", "http"]
```

### 4. 部署

```bash
# 部署應用程式
fly deploy

# 設定環境變數
fly secrets set DB_PASSWORD=your_password DB_HOST=db.example.com

# 檢查應用程式狀態
fly status

# 查看日誌
fly logs
```

---

## 部署至 Railway

### 1. 連接 GitHub 倉庫

1. 訪問 [Railway.app](https://railway.app)
2. 選擇 "New Project" → "Deploy from GitHub Repo"
3. 授權並選擇你的倉庫

### 2. 設定環境變數

在 Railway 專案設定中：

```
APP_ENV=production
APP_DEBUG=false
PORT=3000
DB_CONNECTION=postgres
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_DATABASE=${{Postgres.PGDATABASE}}
```

### 3. 新增資料庫

1. 在 Railway 專案中點擊 "Add" 按鈕
2. 選擇 "PostgreSQL" 或 "MySQL"
3. 連接到你的應用程式

### 4. 部署

Railway 會自動監視你的 Git 倉庫，在每次推送時自動部署。

---

## 部署至 VPS

### 1. 伺服器設定

```bash
# 更新系統
sudo apt-get update && sudo apt-get upgrade -y

# 安裝 Bun
curl -fsSL https://bun.sh/install | bash

# 安裝 PostgreSQL（可選）
sudo apt-get install postgresql postgresql-contrib

# 安裝 Redis（可選）
sudo apt-get install redis-server
```

### 2. 複製應用程式

```bash
# 複製倉庫
git clone https://github.com/your-org/gravito-ddd-starter.git
cd gravito-ddd-starter

# 安裝依賴
bun install

# 設定環境
cp .env.example .env
# 編輯 .env 檔案並設定正式環境值
nano .env

# 構建應用程式
bun run build
```

### 3. 使用 Systemd 執行應用程式

建立服務檔案 `/etc/systemd/system/gravito-ddd-app.service`：

```ini
[Unit]
Description=Gravito DDD Starter Application
After=network.target

[Service]
Type=simple
User=app_user
WorkingDirectory=/home/app_user/gravito-ddd-starter
ExecStart=/home/linuxbrew/.linuxbrew/bin/bun run start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

啟動服務：

```bash
sudo systemctl enable gravito-ddd-app
sudo systemctl start gravito-ddd-app
sudo systemctl status gravito-ddd-app
```

### 4. 使用 Nginx 作為反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. 啟用 HTTPS (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 健康檢查

### 健康檢查端點

應用程式提供健康檢查端點用於監控：

```bash
# 簡單健康檢查
curl http://localhost:3000/health

# 預期回應
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

### 設定容器健康檢查

在 Docker Compose 中：

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

在 Kubernetes 中：

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## 監控與日誌

### 查看應用程式日誌

```bash
# 開發環境
bun run dev    # 日誌直接輸出到終端

# 正式環境（使用 Systemd）
sudo journalctl -u gravito-ddd-app -f

# Docker
docker logs -f container_name

# Fly.io
fly logs

# Railway
railway logs
```

### 結構化日誌

應用程式使用結構化日誌以便進行日誌聚集和監控：

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Request processed",
  "path": "/api/users",
  "method": "GET",
  "status": 200,
  "duration": 45,
  "userId": "usr_123"
}
```

### 日誌聚集

推薦使用：
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **New Relic**
- **Sentry**（用於錯誤追蹤）

### 性能監控

```bash
# 使用 top 監視 CPU 和記憶體
top -p $(pgrep -f "bun run start")

# 使用 htop（更好的界面）
htop

# 檢查磁碟使用
df -h

# 檢查記憶體使用
free -h
```

---

## 故障排除

### 常見部署問題

**問題**：構建失敗

```bash
# 清除快取並重新構建
rm -rf node_modules bun.lockb
bun install
bun run build
```

**問題**：資料庫連線失敗

```bash
# 檢查環境變數
echo $DB_HOST $DB_PORT

# 測試連線
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE
```

**問題**：高記憶體使用率

```bash
# 檢查記憶體洩漏
bun --profile < app.js

# 設定記憶體限制（Docker）
docker run -m 512m gravito-ddd-app:latest
```

**問題**：應用程式不會啟動

```bash
# 檢查埠口是否被佔用
lsof -i :3000

# 查看詳細錯誤日誌
APP_DEBUG=true bun run start
```

---

## 清單

- [ ] 環境變數已正確設定
- [ ] 資料庫已遷移並初始化
- [ ] 依賴已安裝（`bun install --frozen-lockfile`）
- [ ] 測試已通過（`bun run test`）
- [ ] 類型檢查已通過（`bun run typecheck`）
- [ ] Lint 已通過（`bun run lint`）
- [ ] 應用程式在本地運行正常（`bun run dev`）
- [ ] 正式環境構建成功（`bun run build`）
- [ ] 健康檢查端點正常回應
- [ ] 日誌監控已設定
- [ ] 備份策略已實施
- [ ] 回滾計畫已準備

---

## 相關資源

- [Bun 官方文檔](https://bun.sh/docs)
- [Docker 最佳實踐](https://docs.docker.com/develop/dev-best-practices/)
- [Fly.io 部署指南](https://fly.io/docs/)
- [Railway 文檔](https://docs.railway.app/)
