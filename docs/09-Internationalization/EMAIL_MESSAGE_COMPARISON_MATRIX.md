# Email 訊息方案對比矩陣

**版本**: 1.0
**更新日期**: 2026-03-13
**用途**: 快速對比五種方案的優缺點

---

## 核心評分表

| 評估維度 | 方案 A | 方案 B | 方案 C | 方案 D | 方案 E |
|---------|--------|--------|--------|--------|--------|
| **類型安全** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **代碼簡潔** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **可測試性** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **可維護性** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **架構符合度** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **擴展性** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **學習曲線** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **生產就緒** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**總體評分**：
- **方案 A**：4.63/5 🏆
- **方案 C**：4.63/5 🏆
- **方案 B**：2.88/5 ❌
- **方案 D**：3.63/5 ⚠️
- **方案 E**：2.63/5 ❌

---

## 詳細對比表

### 1. 基本特性

| 特性 | 方案 A | 方案 B | 方案 C | 方案 D | 方案 E |
|------|--------|--------|--------|--------|--------|
| **模板複雜度** | 簡單 ✅ | 中等 | 簡單 ✅ | 簡單 ✅ | 複雜 |
| **訊息預翻譯** | 是 ✅ | 否 | 是 ✅ | 是 ✅ | 混合 |
| **Message Service** | 是 ✅ | 否 | 是 ✅ | 是 ✅ | 可選 |
| **Translator 直接調用** | 否 | 是 ✅ | 否 | 否 | 是 |
| **DI 容器依賴** | 中等 | 低 | 中等 | 中等 | 高 |

### 2. 代碼示例對比

#### 方案 A：Template Data Binding

```typescript
// Job 實現
const templateData = {
  subject: this.welcomeEmailMessages.subject(name),
  bodyTitle: this.welcomeEmailMessages.bodyTitle(name),
}
await this.mailer.send({
  template: 'emails/welcome',
  data: templateData,
})

// 代碼行數（每個郵件類型）：
// - Port 介面：~15 行
// - Service 實現：~20 行
// - Job 修改：~10 行
// 總計：45 行
```

#### 方案 B：Template Helper Function

```typescript
// Job 實現
await this.mailer.send({
  template: 'emails/welcome',
  data: {
    t: (key) => this.translator.trans(key),
    name,
  },
})

// 代碼行數：10 行
// 但模板複雜度↑
```

#### 方案 C：Dedicated Email Message Service

```typescript
// Job 實現（與方案 A 相同）
const templateData = {
  subject: this.welcomeEmailMessages.subject(name),
}
await this.mailer.send({
  template: 'emails/welcome',
  data: templateData,
})

// Service Provider 註冊更多服務
container.singleton('welcomeEmailMessages', ...)
container.singleton('orderConfirmationEmailMessages', ...)
container.singleton('passwordResetEmailMessages', ...)

// 代碼行數（整體）：
// 比方案 A 多 30-50% （多個 Service + 註冊）
```

#### 方案 D：Two-Layer Approach

```typescript
// Layer 1: API Messages
interface IAuthMessages {
  loginFailed(): string
}

// Layer 2: Email Messages
interface IEmailMessages {
  welcomeTitle(name: string): string
}

// 代碼重複：同樣訊息內容在兩個 Service 中出現
```

#### 方案 E：Hybrid Approach

```typescript
// Job 實現
let subject: string
if (this.emailMessages) {
  subject = this.emailMessages.subject(name)
} else if (this.translator) {
  subject = this.translator.trans('email.welcome.subject', { name })
} else {
  subject = 'Welcome'
}

// 代碼複雜度↑，維護困難
```

### 3. 實施成本對比

| 成本維度 | 方案 A | 方案 B | 方案 C | 方案 D | 方案 E |
|---------|--------|--------|--------|--------|--------|
| **初始開發時間** | 2-3 天 | 1 天 | 2-3 天 | 3-4 天 | 2 天 |
| **新增郵件類型時間** | 30 分鐘 | 10 分鐘 | 30 分鐘 | 30 分鐘 | 20 分鐘 |
| **測試編寫時間** | 1 小時 | 30 分鐘 | 1.5 小時 | 1.5 小時 | 2 小時 |
| **文檔編寫時間** | 1 小時 | 30 分鐘 | 1.5 小時 | 1.5 小時 | 1 小時 |
| **總體 6 個月成本** | 中等 | 低 | 中等 | 高 | 高 |

### 4. 多語言支持

| 方面 | 方案 A | 方案 B | 方案 C | 方案 D | 方案 E |
|------|--------|--------|--------|--------|--------|
| **切換語言** | 簡單 ✅ | 簡單 | 簡單 ✅ | 簡單 ✅ | 複雜 |
| **上下文隔離** | 完美 ✅ | 差 | 完美 ✅ | 差 | 差 |
| **性能影響** | 無 | 有 | 無 | 無 | 有 |
| **部分翻譯支援** | ✅ | ⚠️ | ✅ | ✅ | ❌ |

### 5. 架構符合度

#### DDD 原則

| 原則 | 方案 A | 方案 B | 方案 C | 方案 D | 方案 E |
|------|--------|--------|--------|--------|--------|
| **Domain 層清晰** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Application 層純淨** | ✅ | ❌ | ✅ | ✅ | ⚠️ |
| **Infrastructure 層責任** | ✅ | ❌ | ✅ | ⚠️ | ⚠️ |
| **分層邊界明確** | ✅ | ❌ | ✅ | ✅ | ⚠️ |

#### Port/Adapter 原則

| 原則 | 方案 A | 方案 B | 方案 C | 方案 D | 方案 E |
|------|--------|--------|--------|--------|--------|
| **Port 介面定義** | ✅ | ❌ | ✅ | ✅ | ⚠️ |
| **Zero Dependency** | ✅ | ❌ | ✅ | ⚠️ | ❌ |
| **易於替換實現** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **可測試性** | ✅ | ❌ | ✅ | ✅ | ⚠️ |

### 6. 測試複雜度

```typescript
// 方案 A / C：簡單明快
mock.mockMessages = {
  subject: () => 'Test Subject',
}
job.handle(data)
expect(mailer.send).toHaveBeenCalledWith({ subject: 'Test Subject' })

// 方案 B：需要 Mock 函數
mock.t = (key) => translations[key]
// 複雜度↑

// 方案 D：需要 Mock 兩個 Service
mock.apiMessages = {...}
mock.emailMessages = {...}
// 複雜度↑↑

// 方案 E：需要測試多個分支
mock.emailMessages = null  // 測試 translator 分支
mock.emailMessages = {...} // 測試 emailMessages 分支
// 複雜度↑↑↑
```

### 7. 團隊規模影響

| 規模 | 推薦方案 | 原因 |
|------|----------|------|
| **1-3 人小團隊** | 方案 A | 簡單快速，維護成本低 |
| **3-10 人團隊** | 方案 C | 清晰責任分離，易協作 |
| **10+ 人企業** | 方案 C | 高度可擴展和可維護 |
| **快速原型** | 方案 B | 最小代碼量 |
| **遺留系統** | 方案 E | 漸進式遷移（臨時用）|

### 8. 缺陷清單

#### 方案 A 的潛在缺陷

- ⚠️ 如果訊息參數很多，Job 代碼會冗長
- ⚠️ 無法在模板層做動態決策

#### 方案 B 的潛在缺陷

- 🔴 **無編譯時檢查**（拼寫錯誤運行時才發現）
- 🔴 **模板複雜度↑**（需要知道所有鍵）
- 🔴 **難以測試**（Mock 函數參數）
- 🔴 **某些環境不支援**（Serverless 沙箱）

#### 方案 C 的潛在缺陷

- ⚠️ 代碼量相對多
- ⚠️ 需要為每種郵件定義新 Service

#### 方案 D 的潛在缺陷

- 🔴 **DRY 原則違反**（代碼重複）
- 🔴 **維護困難**（變更訊息需要同步兩個地方）
- 🔴 **過度設計**（通常不需要完全分層）

#### 方案 E 的潛在缺陷

- 🔴 **複雜性最高**
- 🔴 **難以維護**（兩套邏輯）
- 🔴 **易出錯**（分支遺漏訊息）
- 🔴 **測試成本高**

---

## 決策樹

```
開始
  │
  ├─ 「模板需要邏輯判斷」？
  │   ├─ 是 → 方案 A/C （在 Job 中完成邏輯）
  │   └─ 否 → 繼續
  │
  ├─ 「有多種郵件類型」？
  │   ├─ 是（3 個以上） → 方案 C （清晰責任分離）
  │   ├─ 否（1-2 個） → 方案 A （簡單快速）
  │   └─ 不確定 → 繼續
  │
  ├─ 「需要完全類型安全」？
  │   ├─ 是 → 方案 A/C （避免方案 B）
  │   └─ 否 → 繼續
  │
  ├─ 「快速原型還是生產」？
  │   ├─ 快速原型 → 方案 B
  │   ├─ 生產環境 → 方案 A/C
  │   └─ 遺留系統 → 方案 E （臨時）
  │
  └─ 最終推薦
      ├─ 小團隊 + 簡單郵件 → 方案 A ✅
      └─ 大團隊 + 複雜郵件 → 方案 C ✅
```

---

## gravito-ddd 特定評估

### 與現有 Message Service 相容性

| 方案 | 相容性 | 說明 |
|------|--------|------|
| **A** | ✅ 完美 | 與 AuthMessageService 設計一致 |
| **B** | ❌ 衝突 | 與「類型安全」哲學相悖 |
| **C** | ✅ 完美 | 是 AuthMessageService 的自然擴展 |
| **D** | ❌ 衝突 | DRY 原則違反 |
| **E** | ⚠️ 妥協 | 可與現有系統共存但複雜 |

### 與 Job Queue 系統的適配

| 方案 | Worker 友好度 | 說明 |
|------|----------------|------|
| **A** | ✅ 完美 | Message Service 在 Worker 中自動初始化 |
| **B** | ⚠️ 可以 | 但需要 Worker 支援函數執行 |
| **C** | ✅ 完美 | 與方案 A 相同 |
| **D** | ✅ 完美 | 但需要初始化兩個 Service |
| **E** | ❌ 問題 | Worker 中的條件邏輯易出錯 |

### 與 Port/Adapter 架構的契合度

**評分標準**：0-100，越高越好

| 方案 | 評分 | 說明 |
|------|------|------|
| **A** | 95/100 | 完全符合 Port/Adapter 原則，推薦 |
| **B** | 20/100 | 不符合，破壞 Zero Dependency |
| **C** | 95/100 | 完全符合，與 A 並列推薦 |
| **D** | 70/100 | 符合但有冗餘 |
| **E** | 45/100 | 混合方案，不如純方案 |

---

## 最終建議

### 對於 gravito-ddd 項目

**🏆 推薦方案**：**A + C 混合**

- **簡單郵件**（1-2 個參數）→ 方案 A
- **複雜郵件**（多個參數或邏輯）→ 方案 C

### 不推薦原因

- **方案 B**：失去類型安全，與 DDD 哲學衝突
- **方案 D**：違反 DRY，維護成本高
- **方案 E**：複雜度最高，收益最低

### 下一步

1. 遵循 [EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md](./EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md) 實施
2. 為 `WelcomeEmail` 首先實施方案 A
3. 為後續郵件類型評估是否升級到方案 C
4. 定期審查，根據實際需求調整

