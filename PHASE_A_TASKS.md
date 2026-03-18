# Phase A：框架核心缺口補全 - 詳細任務分解

**週期**: 第 1-3 週（約 54 小時）
**目標**: 完成 OutboxPattern、Inventory、Notification 三個極高優先模組
**狀態**: 🔄 規劃中

---

## A1. OutboxPattern（優先級最高）

**預計工時**: 16 小時 | **難度**: ⭐⭐⭐

### A1.1 架構設計與 Port 定義（2h）

- [ ] **A1.1.1** 設計 `OutboxEntry` 聚合根結構
  - 欄位：id、eventId、aggregateId、eventType、payload、createdAt、processedAt
  - 領域方法：markAsProcessed()、markAsFailed()

- [ ] **A1.1.2** 定義 `IOutboxRepository` Port 介面
  - 方法：save()、findUnprocessed()、markAsProcessed()、getFailedCount()
  - 位置：`Foundation/Domain/Repositories/IOutboxRepository.ts`

- [ ] **A1.1.3** 定義 `IOutboxWorker` Port 介面
  - 方法：processNextBatch()、retryFailed()、getMetrics()
  - 位置：`Foundation/Application/Ports/IOutboxWorker.ts`

### A1.2 Outbox 聚合根實現（3h）

- [ ] **A1.2.1** 實現 `OutboxEntry` 實體
  - 不可變設計、Value Object 包裝 payload
  - 位置：`Foundation/Domain/Entities/OutboxEntry.ts`

- [ ] **A1.2.2** 實現 `OutboxAggregate` 聚合根
  - 追蹤處理狀態、重試次數、最後錯誤
  - Domain 事件：OutboxEntryCreated、OutboxEntryProcessed、OutboxEntryFailed
  - 位置：`Foundation/Domain/Aggregates/OutboxAggregate.ts`

### A1.3 Repository 實現（4h）

- [ ] **A1.3.1** 實現 `MemoryOutboxRepository`
  - 支援分頁查詢未處理項目
  - 位置：`Foundation/Infrastructure/Repositories/MemoryOutboxRepository.ts`

- [ ] **A1.3.2** 實現 `AtlasOutboxRepository`
  - DDL：CREATE TABLE outbox_entries (...)
  - 位置：`Foundation/Infrastructure/Repositories/AtlasOutboxRepository.ts`

- [ ] **A1.3.3** 實現 `DrizzleOutboxRepository`
  - Schema 定義
  - 位置：`Foundation/Infrastructure/Repositories/DrizzleOutboxRepository.ts`

### A1.4 Outbox Worker 與事件分派（4h）

- [ ] **A1.4.1** 實現 `SequentialOutboxWorker`
  - 定期掃描未處理項目（可配置間隔）
  - 最多重試 3 次，超過進入 Dead Letter Queue
  - 位置：`Foundation/Infrastructure/Services/SequentialOutboxWorker.ts`

- [ ] **A1.4.2** 修改 `BaseEventSourcedRepository.save()`
  - 在同一 Transaction 內原子性寫入 Event + Outbox
  - 方法改動：調用 `eventRepository.save()` + `outboxRepository.save()`
  - 位置：`Foundation/Infrastructure/Database/Repositories/BaseEventSourcedRepository.ts`

- [ ] **A1.4.3** 集成至 `ModuleAutoWirer`
  - 啟動 OutboxWorker 後台任務
  - 位置：`Foundation/Infrastructure/Wiring/ModuleAutoWirer.ts`

### A1.5 測試（3h）

- [ ] **A1.5.1** 單元測試：OutboxEntry 與 OutboxAggregate (4 個測試)
  - 狀態轉移、重試計數、Domain 事件

- [ ] **A1.5.2** Repository 測試 (8 個測試)
  - 新增、查詢、更新、失敗標記

- [ ] **A1.5.3** OutboxWorker 集成測試 (6 個測試)
  - 正常分派流程
  - 重試成功
  - Dead Letter Queue 流程

**測試目標**: 16+ 測試，80%+ 覆蓋率

---

## A2. Inventory（擴充 CheckoutSaga）

**預計工時**: 20 小時 | **難度**: ⭐⭐⭐

### A2.1 Inventory 模組腳手架（3h）

- [ ] **A2.1.1** 使用生成器建立模組
  ```bash
  bun scripts/generate-module.ts Inventory --redis --cache
  ```
  生成目錄結構

- [ ] **A2.1.2** 定義 `SKU` Value Object
  - 欄位：code、name、quantity、reserved
  - 方法：reserve()、deduct()、restore()（不可變）
  - 位置：`Modules/Inventory/Domain/ValueObjects/SKU.ts`

- [ ] **A2.1.3** 定義 Domain 事件
  - InventoryReserved、InventoryDeducted、InventoryRestored
  - 位置：`Modules/Inventory/Domain/Events/`

### A2.2 Inventory 聚合根（4h）

- [ ] **A2.2.1** 實現 `InventoryAggregate` 聚合根
  - 追蹤 SKU、庫存、預留
  - 樂觀鎖版本號
  - 方法：reserve()、deduct()、restore()、applyEvent()
  - 位置：`Modules/Inventory/Domain/Aggregates/InventoryAggregate.ts`

- [ ] **A2.2.2** 定義 `IInventoryRepository` Port
  - 方法：findBySku()、save()、getVersion()
  - 位置：`Modules/Inventory/Domain/Repositories/IInventoryRepository.ts`

### A2.3 應用層與防腐層（4h）

- [ ] **A2.3.1** 實現 `ReserveInventoryService`
  - 驗證庫存充足
  - 預留操作
  - 拋出 OptimisticLockException（樂觀鎖衝突）
  - 位置：`Modules/Inventory/Application/Services/ReserveInventoryService.ts`

- [ ] **A2.3.2** 實現 `DeductInventoryService`
  - 扣減庫存（已支付）
  - 位置：`Modules/Inventory/Application/Services/DeductInventoryService.ts`

- [ ] **A2.3.3** 定義 `IInventoryCommandPort` Port（Cart 模組防腐層）
  - 方法：checkAvailability()、reserve()、deduct()
  - 位置：`Modules/Cart/Domain/Ports/IInventoryCommandPort.ts`

### A2.4 Saga 升級（5h）

- [ ] **A2.4.1** 新增 `ReserveInventorySagaStep` 步驟
  - execute()：調用 `ReserveInventoryService`
  - compensate()：釋放預留
  - 位置：`Modules/Cart/Application/Sagas/Steps/ReserveInventorySagaStep.ts`

- [ ] **A2.4.2** 升級 `CheckoutSaga` 至 3 步驟
  ```
  1. CreateOrderStep
  2. InitiatePaymentStep  ← 失敗時，執行下面補償
  3. ReserveInventoryStep ← 新增（失敗回滾整個 Saga）
  ```
  位置：`Modules/Cart/Application/Sagas/CheckoutSaga.ts`

- [ ] **A2.4.3** 實現 `InventoryReservationAdapter`
  - 將 `IInventoryCommandPort` 綁定至 `ReserveInventoryService`
  - 位置：`src/adapters/GravitoInventoryAdapter.ts`

### A2.5 Repository 實現（2h）

- [ ] **A2.5.1** 實現 `MemoryInventoryRepository`（含樂觀鎖）
- [ ] **A2.5.2** 實現 `AtlasInventoryRepository`
- [ ] **A2.5.3** 實現 `DrizzleInventoryRepository`

### A2.6 測試（2h）

- [ ] **A2.6.1** InventoryAggregate 單元測試 (6 個)
  - 正常預留、庫存不足、重複預留

- [ ] **A2.6.2** ReserveInventoryService 測試 (4 個)
  - 成功、失敗、樂觀鎖衝突

- [ ] **A2.6.3** CheckoutSaga 升級測試 (8 個)
  - 3 步驟正常流程
  - Payment 失敗 → 補償
  - Inventory 失敗 → 補償

**測試目標**: 20+ 測試，80%+ 覆蓋率

---

## A3. Notification（多渠道 + IMailer + IJobQueue）

**預計工時**: 18 小時 | **難度**: ⭐⭐⭐

### A3.1 Notification 模組腳手架（3h）

- [ ] **A3.1.1** 建立 Notification 模組
  ```bash
  bun scripts/generate-module.ts Notification --db --cache
  ```

- [ ] **A3.1.2** 定義 `NotificationChannel` Value Object
  - 支援：Email、SMS、WebPush
  - 位置：`Modules/Notification/Domain/ValueObjects/NotificationChannel.ts`

- [ ] **A3.1.3** 定義 Domain 事件
  - NotificationScheduled、NotificationSent、NotificationFailed
  - 位置：`Modules/Notification/Domain/Events/`

### A3.2 Notification 聚合根（3h）

- [ ] **A3.2.1** 實現 `NotificationAggregate` 聚合根
  - 追蹤渠道、收件者、內容、狀態
  - 方法：schedule()、markAsSent()、markAsFailed()
  - 防止重複發送（idempotent key）
  - 位置：`Modules/Notification/Domain/Aggregates/NotificationAggregate.ts`

- [ ] **A3.2.2** 定義 `INotificationRepository` Port

### A3.3 Job 與事件訂閱（5h）

- [ ] **A3.3.1** 實現 `SendOrderConfirmationEmailJob`
  - 實現 `IJob` 介面
  - 調用 `IMailer.send()`
  - 位置：`Modules/Notification/Infrastructure/Jobs/SendOrderConfirmationEmailJob.ts`

- [ ] **A3.3.2** 實現 `SendOrderSmsJob`
  - SMS 渠道（模擬 SMS 服務）
  - 位置：`Modules/Notification/Infrastructure/Jobs/SendOrderSmsJob.ts`

- [ ] **A3.3.3** 實現 `SendShipmentEmailJob`
  - 監聽 OrderShipped 事件
  - 位置：`Modules/Notification/Infrastructure/Jobs/SendShipmentEmailJob.ts`

- [ ] **A3.3.4** 實現 `NotificationSubscriber`
  - 訂閱 OrderPlaced → SendOrderConfirmationEmailJob + SendOrderSmsJob
  - 訂閱 PaymentSucceeded → SendPaymentSuccessEmailJob
  - 訂閱 OrderShipped → SendShipmentEmailJob
  - 位置：`Modules/Notification/Infrastructure/Subscribers/NotificationSubscriber.ts`

- [ ] **A3.3.5** 集成至 Module Index
  - 在 `registerRoutes()` 註冊 Subscriber
  - 位置：`Modules/Notification/index.ts`

### A3.4 Message Service Pattern（3h）

- [ ] **A3.4.1** 定義 `INotificationMessages` Port
  - 方法：orderConfirmed(), paymentReceived(), shipmentNotified()
  - 位置：`Modules/Notification/Presentation/Ports/INotificationMessages.ts`

- [ ] **A3.4.2** 實現 `NotificationMessageService`
  - 使用 ITranslator 與翻譯檔案
  - 位置：`Modules/Notification/Infrastructure/Services/NotificationMessageService.ts`

- [ ] **A3.4.3** 建立翻譯檔案
  - `resources/lang/zh-TW/notification.json`
  - `resources/lang/en/notification.json`

### A3.5 HTTP 端點（2h）

- [ ] **A3.5.1** 實現 `NotificationController`
  - GET `/notifications` - 列表
  - POST `/notifications/send` - 手動發送
  - 位置：`Modules/Notification/Presentation/Controllers/NotificationController.ts`

- [ ] **A3.5.2** 定義路由
  - 位置：`Modules/Notification/Presentation/Routes/Notification.routes.ts`

### A3.6 測試（2h）

- [ ] **A3.6.1** Job 測試 (6 個)
  - 各 Job 的 handle() 方法

- [ ] **A3.6.2** Subscriber 測試 (6 個)
  - 事件觸發 → Job 入隊

- [ ] **A3.6.3** 端點測試 (4 個)
  - 列表、手動發送

**測試目標**: 16+ 測試，80%+ 覆蓋率

---

## 交叉依賴與執行順序

```
A1. OutboxPattern    ← 基礎設施，獨立
A2. Inventory        ← 依賴：Saga、Transaction、OptimisticLock
A3. Notification     ← 依賴：Job Queue、Event Subscriber

建議執行順序：
Week 1：A1（獨立開發）+ A2 架構設計並行
Week 2：A2 完成 + A3 開發
Week 3：A3 完成 + 集成測試
```

---

## 驗收標準

### A1 OutboxPattern
- [ ] 所有 16+ 測試通過
- [ ] Event + Outbox 原子性驗證
- [ ] Worker 後台任務運行正常
- [ ] Dead Letter Queue 流程驗證

### A2 Inventory
- [ ] 所有 20+ 測試通過
- [ ] CheckoutSaga 升級至 3 步驟驗證
- [ ] 樂觀鎖衝突與補償流程驗證
- [ ] 防腐層（IInventoryCommandPort）隔離驗證

### A3 Notification
- [ ] 所有 16+ 測試通過
- [ ] OrderPlaced 自動觸發郵件 + SMS
- [ ] 多 Job 並行入隊驗證
- [ ] HTTP 端點正常運作

### 整體
- [ ] 總計 52+ 測試，100% 通過
- [ ] 編譯通過（bun build）
- [ ] Port Lint 無違規（0 個架構違規）
- [ ] 文檔完整（每模組含 README.md）

---

## 文檔與參考

- **Outbox 參考**: `BaseEventSourcedRepository.save()` 原子性修改點
- **Saga 擴充參考**: `CheckoutSaga` + `SequentialSaga`
- **Job 參考**: `SendWelcomeEmailJob` 實作模式
- **Event Subscriber 參考**: `IntegrationEventBus` + `subscribe()`

---

**更新於**: 2026-03-18
**下次審查**: Week 1 結束時評估進度
