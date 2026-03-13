# 隊列配置系統改進指南

## 現況

隊列配置目前分散在代碼中，沒有統一的配置檔案：

```typescript
// ❌ 不好的做法：硬編碼在 providers/SharedServiceProvider.ts
const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
return new RabbitMQAdapter(url)
```

## 改進方案：統一配置檔案

### 新建配置檔案

✅ **`config/app/queue.ts`** - 統一隊列配置

```typescript
export default {
  default: process.env.EVENT_DRIVER ?? 'memory',

  drivers: {
    memory: { driver: 'memory' },
    redis: {
      driver: 'redis',
      connection: 'default',
      queues: {
        events: 'domain_events_queue',
        jobs: 'system_jobs_queue',
      },
    },
    rabbitmq: {
      driver: 'rabbitmq',
      url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/',
      connection: {
        host: process.env.RABBITMQ_HOST ?? 'localhost',
        port: 5672,
        username: 'guest',
        password: 'guest',
        vhost: '/',
      },
      exchanges: {
        domainEvents: { name: 'gravito.domain.events', type: 'topic' },
        systemJobs: { name: 'gravito.system.jobs', type: 'direct' },
        integrationEvents: { name: 'gravito.integration.events', type: 'topic' },
        deadLetters: { name: 'gravito.dead.letters', type: 'fanout' },
      },
      reconnect: {
        maxAttempts: 10,
        initialDelay: 1000,
      },
    },
  },

  job: {
    retries: 3,
    backoff: 60,
    delay: 0,
  },
}
```

### 改進的服務提供者

✅ **改進後的 `providers/SharedServiceProvider.ts`**

```typescript
import type { QueueConfig } from '@/config/app/queue'

export class SharedServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // 取得配置
    const queueConfig = (container as any).make('config').queue as QueueConfig
    const driver = queueConfig.default

    console.log(`[SharedServiceProvider] 隊列驅動: ${driver}`)

    // 根據驅動建立對應的事件分發器
    container.singleton('eventDispatcher', (c) => {
      if (driver === 'rabbitmq') {
        try {
          const rabbitmqConfig = queueConfig.drivers.rabbitmq
          const rabbitmq = new RabbitMQAdapter(rabbitmqConfig.url)
          return new RabbitMQEventDispatcher(rabbitmq)
        } catch (error) {
          console.warn('[SharedServiceProvider] RabbitMQ 降級為 Memory 模式')
          return new MemoryEventDispatcher()
        }
      }

      if (driver === 'redis') {
        try {
          const redis = c.make('redis') as IRedisService
          return new RedisEventDispatcher(redis)
        } catch (error) {
          console.warn('[SharedServiceProvider] Redis 降級為 Memory 模式')
          return new MemoryEventDispatcher()
        }
      }

      return new MemoryEventDispatcher()
    })

    // 註冊 RabbitMQ 服務
    if (driver === 'rabbitmq') {
      container.singleton('rabbitmq', () => {
        const rabbitmqConfig = queueConfig.drivers.rabbitmq
        const adapter = new RabbitMQAdapter(rabbitmqConfig.url)
        // 可以在這裡設定額外的配置選項
        return adapter
      })
    }
  }
}
```

## 使用場景

### 場景 1：開發環境（Memory）

```bash
# 無需額外設定，預設即可
bun dev
```

配置效果：
```javascript
{
  default: 'memory',
  drivers: {
    memory: { driver: 'memory' }
  }
}
```

### 場景 2：開發環境（Redis）

```bash
# .env.development
EVENT_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
```

配置效果：
```javascript
{
  default: 'redis',
  drivers: {
    redis: {
      driver: 'redis',
      connection: 'default',
      queues: {
        events: 'domain_events_queue',
        jobs: 'system_jobs_queue',
      }
    }
  }
}
```

### 場景 3：生產環境（RabbitMQ）

```bash
# .env.production
EVENT_DRIVER=rabbitmq
RABBITMQ_URL=amqp://user:pass@rabbitmq-server:5672/
RABBITMQ_HOST=rabbitmq-server
RABBITMQ_PORT=5672
RABBITMQ_USER=user
RABBITMQ_PASS=pass
RABBITMQ_VHOST=/
```

配置效果：
```javascript
{
  default: 'rabbitmq',
  drivers: {
    rabbitmq: {
      driver: 'rabbitmq',
      url: 'amqp://user:pass@rabbitmq-server:5672/',
      connection: {
        host: 'rabbitmq-server',
        port: 5672,
        username: 'user',
        password: 'pass',
        vhost: '/',
      },
      exchanges: { /* ... */ },
      reconnect: { /* ... */ },
    }
  }
}
```

## 遷移步驟

### Step 1：驗證新配置檔案

```bash
# 檢查配置是否正確載入
bun dev
# 應該在啟動日誌中看到隊列驅動信息
```

### Step 2：更新服務提供者

將 `providers/SharedServiceProvider.ts` 改為使用配置：

```typescript
const queueConfig = (container as any).make('config').queue
const driver = queueConfig.default
```

### Step 3：更新 CLI Worker

```typescript
// scripts/worker.ts - 可以從配置讀取驅動信息
const queueConfig = (container as any).make('config').queue
const driver = queueConfig.default
```

## 優勢

### ✅ 中心化管理
- 所有隊列配置集中在 `config/app/queue.ts`
- 易於變更和維護

### ✅ 類型安全
```typescript
import type { QueueConfig } from '@/config/app/queue'

const config: QueueConfig = (container as any).make('config').queue
// 完整的 TypeScript 支援
```

### ✅ 環境變數支援
- 所有參數都可以通過環境變數覆蓋
- 支援開發、預發、生產環境配置

### ✅ 擴展性
- 未來新增隊列驅動時，只需在 `drivers` 物件中新增一個選項

## 配置優先級

1. **環境變數** (最高)
   ```bash
   RABBITMQ_URL=amqp://custom:url@host:5672/
   ```

2. **config/app/queue.ts 中的預設值** (中)
   ```typescript
   url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/'
   ```

3. **硬編碼值** (最低)
   ```typescript
   port: 5672  // 直接在配置中
   ```

## 檢查清單

- [ ] 確認 `config/app/queue.ts` 已建立
- [ ] 確認 `config/app/index.ts` 已更新
- [ ] 測試 Memory 驅動: `bun dev`
- [ ] 測試 Redis 驅動: `EVENT_DRIVER=redis bun dev`
- [ ] 測試 RabbitMQ 驅動: `EVENT_DRIVER=rabbitmq bun dev`
- [ ] 更新服務提供者使用新配置 (可選)
- [ ] 更新文檔

## 參考資源

- `config/app/cache.ts` - 類似的配置模式
- `config/app/redis.ts` - Redis 配置參考
- `docs/QUEUE_SYSTEM.md` - 隊列系統完整指南
