# gravito-ddd 框架擴展實施計畫

**版本**: 1.0
**日期**: 2026-03-18
**狀態**: 🔄 規劃中
**目標**: 補全框架缺口 → 電商閉環 → Production 就緒

---

## 執行概述

本計畫分為 **5 個實施 Phase**，20 個新模組，涵蓋：
- ✅ 框架核心缺口補全（Outbox、Saga 展示、Mail/Job 充分利用）
- ✅ 電商功能閉環（Inventory、Notification、Refund、Coupon 等）
- ✅ Production 就緒（CircuitBreaker、RateLimiter、AuditLog、Metrics）
- ✅ 架構模式完整性（EventProjection、Workflow、SpecificationPattern）
- ✅ 跨域展示能力（Subscription、MultiTenant）

---

## Phase A：框架核心缺口補全（第 1-3 週）

### A1. OutboxPattern（極高優先 ⭐⭐⭐）

**目標**: 實現 Transactional Outbox，確保 Event 與 DB 操作原子性

**當前缺陷**:
```typescript
// 現況：save() 後分派，崩潰會遺失事件
async save(aggregate: T): Promise<void> {
  await repository.save(aggregate)
  await eventDispatcher.dispatch(aggregate.events)  // ← 崩潰不會執行
}
```

**解決方案**:
```
Domain Event
  ↓ (寫入同一 Transaction)
Outbox 表
  ↓ (async Worker)
Event Dispatcher (安全分派)
```

**預期成果**:
- [ ] `OutboxEntry` 聚合根 + Repository
- [ ] `BaseEventSourcedRepository` 修改，事件原子性寫入
- [ ] `OutboxWorker` 非同步掃描與分派
- [ ] 故障降級：重試機制、Dead Letter Queue
- [ ] 12+ 單元測試 + 6+ 集成測試

**複雜度**: ⭐⭐⭐

---

### A2. Inventory（極高優先 ⭐⭐⭐）

**目標**: 庫存管理模組，擴充 CheckoutSaga 至 3 步驟，演示真實補償

**業務流程**:
```
CheckoutSaga (3 步)
  1. CreateOrder      ✓
  2. InitiatePayment  ✓
  3. ReserveInventory ← 新增

補償反向（若 Payment 失敗）:
  2. RevertPayment
  1. ReleaseInventory
  0. CancelOrder
```

**領域設計**:
- `InventoryAggregate`: SKU 庫存、預留、扣減（樂觀鎖）
- `InventoryReserved`, `InventoryDeducted` 事件
- `IInventoryCommandPort`: Cart 模組查詢庫存（防腐層）
- Saga 補償邏輯：庫存不足 → Order 取消 → Payment 退款

**預期成果**:
- [ ] `Inventory` 模組完整實現
- [ ] `CheckoutSaga` 升級至 3 步驟
- [ ] 樂觀鎖衝突演示
- [ ] Saga 補償流程驗證
- [ ] 20+ 單元測試 + 10+ Saga 集成測試

**複雜度**: ⭐⭐⭐

---

### A3. Notification（極高優先 ⭐⭐⭐）

**目標**: 充分展示 IMailer + IJobQueue，訂閱多個 IntegrationEvent

**支援渠道**:
- Email（歡迎、訂單確認、出貨通知）
- SMS（支付結果、訂單提醒）
- WebPush（新品上市、折扣推播）

**事件流**:
```
OrderPlaced → SendOrderConfirmationEmailJob
                + SendOrderSmsJob
                + SaveNotificationLog

PaymentSucceeded → SendPaymentSuccessEmailJob
                   + UpdatePaymentMetrics

OrderShipped → SendShipmentEmailJob
               + SendWebPushNotification
```

**架構**:
- `Notification` 聚合根（記錄通知狀態，防止重複發送）
- `NotificationJob` 實現 `IJob`（使用 IJobQueue）
- `NotificationSubscriber` 訂閱多個事件
- Retry 機制：失敗重試 3 次後進入 Dead Letter Queue

**預期成果**:
- [ ] `Notification` 模組
- [ ] 3 種通知渠道實現
- [ ] 多事件訂閱模式展示
- [ ] IMailer + IJobQueue 充分使用
- [ ] 30+ 測試（Job、Subscriber、防重）

**複雜度**: ⭐⭐⭐

---

## Phase B：電商功能閉環（第 4-5 週）

### B1. Shipment（高優先 ⭐⭐）

監聽 OrderShipped，管理物流狀態機。

**模組**: `Shipment`
**狀態機**: `Pending → Shipped → InTransit → Delivered → Returned`

---

### B2. Refund（高優先 ⭐⭐⭐⭐）

複雜 3 模組 Saga（Order + Payment + Inventory），展示分散事務協調的終極應用。

**模組**: `Refund`
**Saga**: `RefundSaga` (4 步驟 + 補償)

---

### B3. Coupon（高優先 ⭐⭐⭐）

折扣碼核銷，DiscountPolicy Domain Service，樂觀鎖搶券。

**模組**: `Coupon`
**特性**: 限量折扣、使用次數上限、過期機制

---

### B4. Review（中優先 ⭐⭐）

訂單完成後的商品評價與審核。

**模組**: `Review`
**特性**: CQRS 評分統計投影

---

### B5. AuditLog（高優先 ⭐⭐）

不可竄改的業務操作審計軌跡。

**模組**: `AuditLog`
**特性**: Write-Once 聚合根 + 全局事件投影

---

### B6. Metrics（高優先 ⭐⭐）

業務指標收集（訂單量、支付成功率、轉化率）。

**模組**: `Metrics`
**特性**: IMetricsCollector Port + 全局事件觀察者

---

## Phase C：Production 就緒（第 6-7 週）

### C1. CircuitBreaker（高優先 ⭐⭐⭐）

外部服務故障隔離（Payment Gateway、Email Server）。

**模組**: 無（Decorator 模式包裝現有 Port）
**特性**: 失敗計數 → Open → Half-Open → Closed

---

### C2. RateLimiter（高優先 ⭐⭐）

API 端點速率限制。

**模組**: 無（IMiddlewareResolver 擴展）
**特性**: Redis Token Bucket / 本機計數器

---

### C3. EventProjection（高優先 ⭐⭐⭐）

補全 CQRS 讀側「建立流程」，BaseProjector 抽象。

**模組**: 無（Foundation 新增基礎設施）
**特性**: 事件回放 → 投影表 + 重建機制

---

## Phase D：架構模式展示（按需，第 8-12 週）

### D1. SpecificationPattern（中優先 ⭐⭐）

可組合業務規則物件。

**模組**: Foundation Domain 新增 `ISpecification<T>` 介面

---

### D2. Workflow（中優先 ⭐⭐⭐⭐）

可配置多步驟審批流程，區別於 Saga。

**模組**: `Workflow`
**特性**: Process Manager 模式、狀態機、權限檢查

---

### D3. EventProjection 應用

多模組事件投影為複雜報表讀側。

---

## Phase E：跨域展示（長期）

### E1. Subscription（中優先 ⭐⭐⭐）

展示框架非電商應用：月費訂閱、計費週期。

---

### E2. MultiTenant（長期 ⭐⭐⭐⭐⭐）

SaaS 多租戶資料隔離，框架展示上限。

---

## 優先級對應任務分解

### 🔴 極高優先（Phase A，第 1-3 週）

| # | 模組 | 任務數 | 預計工時 | 狀態 |
|---|------|-------|--------|------|
| A1 | OutboxPattern | 8 | 16h | ⏳ 待開始 |
| A2 | Inventory | 12 | 20h | ⏳ 待開始 |
| A3 | Notification | 10 | 18h | ⏳ 待開始 |

**小計**: 30 項任務 / 54 小時 / **3 週內完成**

---

### 🟠 高優先（Phase B + C，第 4-7 週）

| # | 模組 | 任務數 | 預計工時 | 狀態 |
|---|------|-------|--------|------|
| B1 | Shipment | 6 | 10h | ⏳ 待開始 |
| B2 | Refund | 10 | 18h | ⏳ 待開始 |
| B3 | Coupon | 8 | 14h | ⏳ 待開始 |
| B5 | AuditLog | 6 | 12h | ⏳ 待開始 |
| B6 | Metrics | 6 | 10h | ⏳ 待開始 |
| C1 | CircuitBreaker | 6 | 12h | ⏳ 待開始 |
| C2 | RateLimiter | 5 | 8h | ⏳ 待開始 |
| C3 | EventProjection | 8 | 16h | ⏳ 待開始 |

**小計**: 55 項任務 / 100 小時 / **4 週內完成**

---

### 🟡 中優先（Phase D，第 8-12 週）

| # | 模組 | 任務數 | 預計工時 | 狀態 |
|---|------|-------|--------|------|
| D1 | SpecificationPattern | 4 | 8h | ⏳ 待開始 |
| D2 | Workflow | 12 | 22h | ⏳ 待開始 |
| B4 | Review | 6 | 10h | ⏳ 待開始 |

**小計**: 22 項任務 / 40 小時 / **2 週內完成**

---

### 🟢 長期目標（Phase E）

Subscription、MultiTenant 等跨域應用

---

## 下一步行動

### 立即開始（本週）

1. **建立 Phase A 任務清單** - 細化 OutboxPattern、Inventory、Notification 的具體任務
2. **確定團隊分配** - 決定是否並行執行 A1/A2/A3
3. **更新 CLAUDE.md** - 將新模組納入架構規範

### 第 1 週

- [ ] OutboxPattern 模組完成
- [ ] Inventory 原型設計完成
- [ ] Notification 事件訂閱架構設計完成

### 第 2-3 週

- [ ] Inventory 模組完成 + CheckoutSaga 升級
- [ ] Notification 模組完成 + 多渠道集成測試

### 後續

遵循「高優先 → 中優先 → 長期」順序逐步推進

---

## 關鍵參考

- **Outbox 實現參考**: `BaseEventSourcedRepository.save()` 原子性修改點
- **Saga 擴充參考**: `CheckoutSaga` 升級為 3 步驟
- **事件訂閱參考**: `IntegrationEventBus` + 多 Subscriber 模式
- **Job Queue 參考**: `SendWelcomeEmailJob` 模式推廣

---

## 成功指標

| 指標 | 目標 | 驗證方式 |
|------|------|--------|
| Phase A 完成度 | 100% | 3 個模組全部 + 測試通過 |
| 測試覆蓋率 | 80%+ | 新增代碼覆蓋率統計 |
| 文檔完整度 | 每模組含 README.md | 生成文件清單 |
| 架構規範遵循 | 0 架構違規 | `port-lint.ts` 掃描通過 |
| 編譯成功 | tsc 無錯誤 | `bun build` 通過 |

---

**更新於**: 2026-03-18
**下次審查**: 完成 Phase A 後
