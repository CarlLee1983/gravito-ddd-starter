# Notification 模組

通知模組是一個純應用層模組，展示框架的 **事件驅動** 和 **背景任務隊列** 能力。

## 功能概述

Notification 模組訂閱多個業務事件，通過 Job Queue 非同步發送通知 Email：

| 事件 | 觸發時機 | 處理方式 |
|------|--------|---------|
| **OrderPlaced** | 訂單建立 | 發送訂單確認信 |
| **PaymentSucceeded** | 支付成功 | 發送支付成功信 |
| **PaymentFailed** | 支付失敗 | 發送支付失敗通知 |

## 架構設計

### 為什麼是純應用層模組？

Notification 沒有 Domain aggregate 或 Repository，因為：
- **通知記錄不屬於核心業務邏輯**：它們是副作用（side effect）
- **Email 發送由事件驅動**：無需業務規則引擎
- **無需持久化複雜狀態**：簡潔展示 Handler → Job → Mailer 的協作

### 完整流程

```
OrderPlaced Event (from Order Module)
    ↓
EventDispatcher.subscribe()
    ↓
SendOrderConfirmEmailHandler.handle()
    ↓
jobQueue.push(Job)
    ↓
[Background Worker Process]
    ↓
SendOrderConfirmEmailJob.handle()
    ↓
IMailer.send()
```

## 檔案結構

```
app/Modules/Notification/
├── Application/
│   ├── Handlers/                                    # 事件訂閱者
│   │   ├── SendOrderConfirmEmailHandler.ts         # OrderPlaced → Job
│   │   ├── SendPaymentSuccessEmailHandler.ts       # PaymentSucceeded → Job
│   │   └── SendPaymentFailedEmailHandler.ts        # PaymentFailed → Job
│   └── Jobs/
│       ├── SendOrderConfirmEmailJob.ts             # 發送訂單確認信
│       ├── SendPaymentSuccessEmailJob.ts           # 發送支付成功信
│       └── SendPaymentFailedEmailJob.ts            # 發送支付失敗信
├── Domain/
│   └── Events/                                     # 事件重新導出（防腐層）
│       ├── OrderPlaced.ts
│       ├── PaymentSucceeded.ts
│       └── PaymentFailed.ts
├── Infrastructure/
│   ├── Providers/
│   │   └── NotificationServiceProvider.ts          # 依賴註冊 + 事件訂閱
│   └── Services/
│       └── NotificationMessageService.ts           # i18n 訊息
├── Presentation/
│   └── Ports/
│       └── INotificationMessages.ts                # C4 層 Message Port
├── index.ts                                        # 模組導出點
└── README.md                                       # 本檔案
```

## 核心概念

### 1. 事件驅動架構

Handlers 訂閱外部事件，無需知道事件的來源：

```typescript
EventListenerRegistry.register({
  moduleName: 'Notification',
  listeners: [
    {
      eventName: 'OrderPlaced',
      handlerFactory: (c) => {
        const handler = c.make('sendOrderConfirmEmailHandler')
        return (event) => handler.handle(event)
      }
    }
  ]
})
```

### 2. 背景任務隊列

Jobs 在背景 Worker 進程中執行，支援：
- **重試機制**：`tries: 3`, `backoff: 60` 秒
- **延遲執行**：`delay: 0`（立即）
- **異常處理**：拋出異常觸發重試

### 3. 國際化訊息

所有訊息都通過 INotificationMessages Port，支援多語言：

```typescript
const subject = this.translator.trans('notification.order_confirm_subject', { orderId })
```

## 使用示例

### 訂閱事件

在 Handler 中接收事件資料：

```typescript
async handle(event: OrderPlaced): Promise<void> {
  const { orderId, userId, total, currency } = event.data

  // 推送 Job 到隊列
  const jobData: SendOrderConfirmEmailData = {
    orderId,
    email: 'user@example.com',
    amount: total,
    currency
  }

  await this.jobQueue.push(jobMeta.jobName, jobPayload)
}
```

### 執行背景任務

在 Job 中實際發送 Email：

```typescript
async handle(data: SendOrderConfirmEmailData): Promise<void> {
  const { orderId, email, amount, currency } = data

  const subject = this.translator.trans('notification.order_confirm_subject', { orderId })
  const content = this.translator.trans('notification.order_confirm_body', {
    amount: `${amount} ${currency}`
  })

  await this.mailer.send({ to: email, subject, text: content })
}
```

## 測試策略

### 單元測試
- 驗證 Job 的郵件發送邏輯
- 驗證 Handler 的 Job dispatch 邏輯
- 驗證訊息服務的翻譯

### 整合測試
- 驗證事件訂閱完整流程
- 驗證 OrderPlaced → Handler → Job → IMailer 的完整鏈

## 擴展計畫

### A3.5：HTTP 端點
- `GET /notifications/orders/:orderId` - 查詢訂單通知日誌
- `GET /notifications/payments/:paymentId` - 查詢支付通知日誌

### A3.6：通知記錄
- 在 OutboxPattern 中記錄已發送的通知
- 支援重試失敗的通知

### 未來支援
- SMS 通知：`SendSmsHandler` + `SendSmsJob`
- WebPush 通知：`SendPushHandler` + `SendPushJob`
- Slack 通知：`SendSlackHandler` + `SendSlackJob`

## 設計決策

| 決策 | 理由 |
|------|------|
| **純應用層模組** | 通知無業務邏輯，只是副作用 |
| **使用 EventListenerRegistry** | 集中管理事件訂閱，避免循環依賴 |
| **使用 JobRegistry** | 統一註冊 Job Handler，支援隊列自動綁定 |
| **使用 IMailer Port** | 郵件服務可替換（GravitoMailAdapter 是 stub） |
| **使用 INotificationMessages** | 模組自治，訊息集中管理 |

## 參考資源

- [IMailer Port](../../Foundation/Infrastructure/Ports/Services/IMailer.ts)
- [IJobQueue Port](../../Foundation/Infrastructure/Ports/Messaging/IJobQueue.ts)
- [EventListenerRegistry](../../Foundation/Infrastructure/Registries/EventListenerRegistry.ts)
- [JobRegistry](../../Foundation/Infrastructure/Registries/JobRegistry.ts)
- [Order Module](../Order/README.md)
- [Payment Module](../Payment/README.md)
