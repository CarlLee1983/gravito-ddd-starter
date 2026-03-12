# Laravel-style Queue 系統實作指南

## 概述

本文件描述 gravito-ddd 中實現的 Laravel-style Queue 系統。該系統提供開發者友好的異步任務處理能力，完全整合 DDD 架構。

## 核心組件

### 1. BaseJob - Job 抽象基底

**位置**: `app/Shared/Application/Jobs/BaseJob.ts`

所有 Job 都應繼承 `BaseJob` 並實現 `handle()` 方法。

```typescript
export abstract class BaseJob<TData = Record<string, unknown>> {
  abstract readonly jobName: string       // Job 識別碼
  readonly tries: number = 3              // 重試次數
  readonly backoff: number = 60           // 重試延遲（秒）
  readonly delay: number = 0              // 初始延遲（秒）
  abstract handle(data: TData): Promise<void>  // 業務邏輯
}
```

### 2. dispatchJob Helper

**位置**: `app/Shared/Application/Jobs/dispatchJob.ts`

簡化推送 Job 到隊列的過程。

```typescript
await dispatchJob(jobQueue, new SendWelcomeEmailJob(), {
  userId: 'usr-123',
  name: 'John Doe',
  email: 'john@example.com'
})
```

### 3. EventListenerRegistry - 中心化事件訂閱

**位置**: `app/Shared/Infrastructure/EventListenerRegistry.ts`

集中管理所有事件監聽，提供清晰的事件流視圖。

**在 Module ServiceProvider 中註冊**:
```typescript
EventListenerRegistry.register({
  moduleName: 'User',
  listeners: [
    {
      eventName: 'UserCreated',
      handlerFactory: (c) => c.make('sendWelcomeEmailHandler')
    }
  ]
})
```

### 4. JobRegistry - 中心化 Job 處理

**位置**: `app/Shared/Infrastructure/JobRegistry.ts`

集中管理所有 Job 定義與處理程序。

**在 Module ServiceProvider 中註冊**:
```typescript
JobRegistry.register({
  moduleName: 'User',
  jobs: [
    {
      jobName: 'user.send_welcome_email',
      jobFactory: (c) => c.make('sendWelcomeEmailJob')
    }
  ]
})
```

### 5. SystemWorker - Worker 實現

**位置**: `app/Shared/Application/SystemWorker.ts`

實現 `IQueueWorker` 介面，負責消費隊列任務。

**主要方法**:
- `start()`: 啟動 Worker，開始消費隊列
- `stop()`: 停止接受新任務
- `waitForIdle(timeout?)`: 等待當前任務完成

### 6. Worker CLI

**位置**: `scripts/worker.ts`

獨立進程運行隊列任務。

```bash
# 使用預設配置（memory 驅動）
bun scripts/worker.ts

# 使用 Redis 驅動
EVENT_DRIVER=redis bun scripts/worker.ts

# 優雅關閉（SIGTERM/SIGINT）會等待當前任務完成
```

## 完整事件 → Job 流程

```
HTTP 請求
  ↓
CreateUserService.execute()
  ↓
UserRepository.save() → raiseEvent(UserCreated)
  ↓
EventDispatcher.dispatch(UserCreated)
  ↓
[EventListenerRegistry 自動路由]
  ↓
SendWelcomeEmail.handle(event)        ← Handler（薄層）
  ↓
dispatchJob(jobQueue, SendWelcomeEmailJob, data)
  ↓
IJobQueue.push('user.send_welcome_email', JobPayload)
  ↓
[Worker 進程（Redis polling 或 RabbitMQ consumer）]
  ↓
SendWelcomeEmailJob.handle(data)      ← 實際業務邏輯
  ↓
IMailer.send(...)                      ← 外部服務調用
```

## 創建新 Job

### Step 1: 定義 Job 資料型別

```typescript
// app/Modules/Notification/Application/Jobs/SendNotificationData.ts
export interface SendNotificationData {
  userId: string
  title: string
  message: string
}
```

### Step 2: 實現 Job 類

```typescript
// app/Modules/Notification/Application/Jobs/SendNotificationJob.ts
import { BaseJob } from '@/Shared/Application/Jobs/BaseJob'

export class SendNotificationJob extends BaseJob<SendNotificationData> {
  readonly jobName = 'notification.send'
  readonly tries = 3
  readonly backoff = 60

  constructor(private notificationService: INotificationService) {
    super()
  }

  async handle(data: SendNotificationData): Promise<void> {
    await this.notificationService.send({
      userId: data.userId,
      title: data.title,
      message: data.message
    })
  }
}
```

### Step 3: 在 ServiceProvider 中註冊

```typescript
// app/Modules/Notification/Infrastructure/Providers/NotificationServiceProvider.ts

override register(container: IContainer): void {
  // 註冊 Job
  container.singleton('sendNotificationJob', (c) => {
    return new SendNotificationJob(c.make('notificationService'))
  })

  // 向 JobRegistry 聲明
  JobRegistry.register({
    moduleName: 'Notification',
    jobs: [
      {
        jobName: 'notification.send',
        jobFactory: (c) => c.make('sendNotificationJob')
      }
    ]
  })

  // 若需要事件觸發，向 EventListenerRegistry 聲明
  EventListenerRegistry.register({
    moduleName: 'Notification',
    listeners: [
      {
        eventName: 'SomeEvent',
        handlerFactory: (c) => (event) => c.make('someHandler').handle(event)
      }
    ]
  })
}
```

### Step 4: 在 Handler 中 Dispatch Job

```typescript
// app/Modules/Notification/Application/Handlers/SendOnEvent.ts
import { dispatchJob } from '@/Shared/Application/Jobs/dispatchJob'

export class SendOnEvent {
  constructor(private jobQueue: IJobQueue) {}

  async handle(event: SomeEvent): Promise<void> {
    await dispatchJob(this.jobQueue, new SendNotificationJob(...), {
      userId: event.userId,
      title: 'Event Triggered',
      message: event.message
    })
  }
}
```

## 配置

### 環境變數

```bash
# EVENT_DRIVER: 事件與隊列驅動
# 可選值: memory, redis, rabbitmq
EVENT_DRIVER=redis

# 其他配置由各驅動的適配器定義
```

### Worker 啟動選項

```bash
# 基本啟動
bun scripts/worker.ts

# 指定特定隊列（若實現支援）
bun scripts/worker.ts --queue=emails,notifications

# 覆蓋驅動
bun scripts/worker.ts --driver=rabbitmq
```

## 監控與日誌

### 開發環境日誌

在 `NODE_ENV=development` 時，Registry 會輸出詳細日誌：

```
[EventListenerRegistry] Registered 2 listeners for module: User
  ✓ [User] Bound listener for event: UserCreated
🔗 [EventListenerRegistry] Successfully bound 2 event listeners

[JobRegistry] Registered 1 jobs for module: User
  ✓ [User] Registered job handler for: user.send_welcome_email
🔗 [JobRegistry] Successfully bound 1 job handlers
```

### Worker 日誌

```
╔════════════════════════════════════════╗
║       Queue Worker - gravito-ddd       ║
╚════════════════════════════════════════╝

📍 Driver: redis
🔧 PID: 12345
⏰ Started: 2026-03-12T...

✅ Worker started successfully

[SystemWorker] 處理領域事件: UserCreated
[SystemWorker] 處理背景工作: user.send_welcome_email
```

## 錯誤處理與重試

### Job 失敗

若 `Job.handle()` 拋出異常，隊列會根據配置重試：

```typescript
export class MyJob extends BaseJob {
  readonly tries = 3        // 最多 3 次
  readonly backoff = 60     // 每次重試延遲 60 秒

  async handle(data: any) {
    try {
      // 可能失敗的操作
      await someService.doSomething()
    } catch (error) {
      // 記錄錯誤但拋出以觸發重試
      this.logger.error('Operation failed', error)
      throw error
    }
  }
}
```

### 監聽器失敗

若事件 Handler 拋出異常，EventDispatcher 會根據實現決定是否重試。

## 優雅關閉

Worker 支援優雅關閉，確保正在進行的任務完成後再退出：

```bash
# 發送 SIGTERM 信號
kill -TERM <worker-pid>

# Worker 將：
# 1. 停止接受新任務
# 2. 等待當前任務完成（30 秒超時）
# 3. 安全退出
```

## 測試

### 單元測試

```bash
# 測試 EventListenerRegistry
bun test tests/Unit/Shared/EventListenerRegistry.test.ts

# 測試 JobRegistry
bun test tests/Unit/Shared/JobRegistry.test.ts

# 測試 Job 實現
bun test tests/Unit/Modules/User/SendWelcomeEmailJob.test.ts
```

### 集成測試

```bash
# 完整的事件 → Job dispatch 流程測試
bun test tests/Integration/
```

### E2E 測試

```bash
# 使用 Playwright 測試完整的使用者流程
bun test tests/Feature/
```

## 最佳實踐

1. **Handler 應保持薄層**：只負責 dispatch Job，不實現業務邏輯
2. **Job 應專注業務邏輯**：實現實際的異步操作
3. **使用 Registry**：所有事件與 Job 都應通過 Registry 聲明，提供清晰的依賴視圖
4. **正確的重試配置**：根據業務需求調整 `tries` 和 `backoff`
5. **詳細的日誌**：在 Job 中記錄操作步驟，便於除錯
6. **錯誤恢復**：Job 失敗時應能從中恢復，或至少記錄清晰的錯誤信息

## 常見問題

### Q: Job 多次失敗後會怎樣？

A: Job 達到 `tries` 上限後，將被標記為失敗並記錄到 Job 失敗日誌。具體行為由 JobQueue 實現決定（通常存儲在失敗隊列中）。

### Q: 能否修改執行中的 Job？

A: 不建議。若需要修改業務邏輯，應修改 Job 實現，新任務會使用新的邏輯。正在執行的舊 Job 不受影響。

### Q: Worker 進程可以有多個嗎？

A: 可以。多個 Worker 進程可以並行消費同一個隊列。各自獨立處理任務。

### Q: 如何保證事件順序？

A: 單個事件的 Handler 會按註冊順序執行。若需要全局順序，使用單一 Worker 並確保隊列配置合理。

## 相關文件

- [DDD 架構指南](./ARCHITECTURE.md)
- [模組開發指南](./04-Module-Development/MODULE_GUIDE.md)
- [服務提供者配置](./SERVICE_PROVIDER.md)
