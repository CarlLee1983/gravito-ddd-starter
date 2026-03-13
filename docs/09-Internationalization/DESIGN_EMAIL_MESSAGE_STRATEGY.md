# Email 訊息設計策略分析

**文件版本**: 1.0
**更新日期**: 2026-03-13
**分析對象**: gravito-ddd 中的 Email 訊息國際化設計

---

## 概述

本文件分析在 gravito-ddd 中實現 **Email 模板的國際化訊息管理** 的多種方案，評估各方案的優缺點，並提出建議的最佳實踐。

### 問題陳述

當前 gravito-ddd 中的訊息管理系統（方案 4：Message Service Object）已成功應用於：
- HTTP API 回應訊息（AuthController 等）
- 日誌訊息（Logger 整合）
- 業務錯誤提示（Exception Messages）

**新的挑戰**：如何在 **Email 模板** 中使用這些訊息？

#### 技術約束
1. **Email 模板是靜態文件**（HTML、EJS、Handlebars 等）
2. **模板無法調用 TypeScript 方法**（無法執行 `authMessages.loginFailed()`）
3. **模板引擎與後端通信的唯一方式是傳遞變數**
4. **必須保持 Port/Adapter 架構的「零依賴」特性**
5. **Job 執行發生在背景 Worker 進程**（DI 容器可用，但上下文受限）

---

## 現有設計狀態

### 1. 當前 Message Service 設計（方案 4）

#### 優點
✅ **類型安全**：編譯時檢查，無拼寫錯誤
✅ **集中管理**：所有訊息鍵集中在一個介面
✅ **簡潔易讀**：`authMessages.loginFailed()` 比 `trans('auth.login.failed')` 更清晰
✅ **易於重構**：IDE 重命名工具支援
✅ **Gravito 整合優秀**：已在 AuthController、Logger 層實現

#### 當前架構
```
Domain Layer
  ↓ (完全無關 i18n)
Application Layer
  ↓ (依賴 ITranslator 或 Message Service)
Presentation Layer (Controllers)
  ├─ 使用 IAuthMessages (AuthMessageService)
  ├─ 直接在 HTTP 回應中返回訊息
  └─ ✅ 工作良好

Background Jobs Layer (SendWelcomeEmailJob)
  ├─ 使用 ITranslator 直接翻譯
  ├─ 訊息注入到 IMailer.send() 的 data 參數中
  └─ ⚠️ 問題：沒有使用 Message Service，無法重用 Controllers 中的訊息定義
```

### 2. 當前 IMailer Port 設計

```typescript
export interface MailOptions {
  to: string | string[]
  subject: string
  template?: string      // 模板文件名
  data?: Record<string, any>  // 傳遞給模板的變數 ✅
  text?: string
  html?: string
  from?: string
  attachments?: any[]
}

export interface IMailer {
  send(options: MailOptions): Promise<void>
  queue(options: MailOptions): Promise<void>
}
```

### 3. 當前 Email 發送流程（SendWelcomeEmailJob）

```typescript
// 在 Job 的 handle() 方法中
const subject = this.translator.trans('user.welcome_subject', { name })
const content = this.translator.trans('user.welcome_body', { name })

await this.mailer.send({
  to: email,
  subject: subject,
  text: content,
  // ⚠️ 沒有傳遞 template 和 data，無法使用模板
})
```

---

## 五種方案詳細評估

### 方案 A：Template Data Binding（推薦）

**核心概念**：在後端提前翻譯所有訊息，直接注入 `data` 參數

#### 實現方式

```typescript
// Step 1: 建立 Email 專用的 Message Service
export interface IWelcomeEmailMessages {
  subject(name: string): string
  bodyTitle(name: string): string
  confirmButtonLabel(): string
  confirmationText(confirmUrl: string): string
}

export class WelcomeEmailMessageService implements IWelcomeEmailMessages {
  constructor(private translator: ITranslator) {}

  subject(name: string): string {
    return this.translator.trans('email.welcome.subject', { name })
  }

  bodyTitle(name: string): string {
    return this.translator.trans('email.welcome.body_title', { name })
  }

  confirmButtonLabel(): string {
    return this.translator.trans('email.welcome.confirm_button')
  }

  confirmationText(confirmUrl: string): string {
    return this.translator.trans('email.welcome.confirmation_text', {
      confirmUrl
    })
  }
}

// Step 2: 在 Job 中使用
export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
  constructor(
    private readonly mailer: IMailer,
    private readonly logger: ILogger,
    private readonly welcomeEmailMessages: IWelcomeEmailMessages  // ✅ 注入
  ) {
    super()
  }

  async handle(data: SendWelcomeEmailData): Promise<void> {
    const { userId, name, email } = data

    // 準備模板數據：所有訊息提前翻譯
    const templateData = {
      name,
      email,
      subject: this.welcomeEmailMessages.subject(name),
      bodyTitle: this.welcomeEmailMessages.bodyTitle(name),
      confirmButtonLabel: this.welcomeEmailMessages.confirmButtonLabel(),
      confirmationText: this.welcomeEmailMessages.confirmationText(
        `https://example.com/confirm/${userId}`
      ),
    }

    // 發送郵件
    await this.mailer.send({
      to: email,
      subject: templateData.subject,
      template: 'emails/welcome',
      data: templateData,  // ✅ 全部已翻譯
    })
  }
}

// Step 3: 模板使用（EJS 範例）
// views/emails/welcome.ejs
<h1><%= bodyTitle %></h1>
<p><%= confirmationText %></p>
<a href="<%= confirmUrl %>" class="btn">
  <%= confirmButtonLabel %>
</a>
```

#### 優點
✅ **完全類型安全**：Message Service 保證所有鍵存在
✅ **零模板複雜性**：模板只接收已翻譯的字符串
✅ **重用訊息定義**：與 API 回應共享訊息邏輯
✅ **易於測試**：Mock IWelcomeEmailMessages 即可
✅ **Port/Adapter 架構完美適配**：Message Service 實現 Port，Job 只依賴 Port
✅ **支持所有模板引擎**：EJS、Handlebars、Nunjucks 都支援
✅ **多語言支持自然**：在 Job 中設置 locale，Message Service 自動應用

#### 缺點
❌ **如果訊息參數複雜**：需要在 Job 中完成大量計算
❌ **為每種郵件類型定義新 Message Service**：增加代碼量（但利於分離關注點）
❌ **Message Service 可能重複代碼**：與 AuthMessageService 相似的結構

#### 適用場景
- ✅ 絕大多數 Email 場景（最推薦）
- ✅ 郵件內容相對固定，參數化程度中等
- ✅ 需要嚴格的類型檢查和可維護性

---

### 方案 B：Template Helper Function

**核心概念**：提供翻譯函數給模板引擎，模板負責調用翻譯

#### 實現方式

```typescript
// 方案 B1：純函數式
await this.mailer.send({
  to: email,
  subject: 'Welcome',
  template: 'emails/welcome',
  data: {
    name,
    t: (key: string) => this.translator.trans(key),  // ❌ 提供函數
  },
})

// 模板中使用
<h1><%= t('email.welcome.body_title') %></h1>
```

#### 優點
✅ **減少後端代碼**：不需要為每封郵件定義 Message Service
✅ **靈活性強**：模板可以動態決定使用哪些訊息鍵
✅ **易於擴展**：新增訊息無需修改後端 Job

#### 缺點
❌ **模板複雜度上升**：模板需要知道所有訊息鍵
❌ **無法編譯時檢查**：`t('email.welcome.typo')` 運行時才發現
❌ **難以測試**：難以 Mock 函數參數
❌ **訊息鍵分散**：跨越 YAML 和 EJS 文件，維護困難
❌ **可能性能問題**：每次模板渲染都需要函數調用
❌ **模板引擎限制**：某些無服務器環境的模板引擎不支援執行自訂函數

#### 適用場景
- ❌ 不推薦用於 gravito-ddd（與 DDD 類型安全哲學衝突）
- ⚠️ 適用於「快速原型」或「簡單郵件模板」

---

### 方案 C：Dedicated Email Message Service

**核心概念**：為每種郵件類型創建專用的 Message Service

#### 實現方式

```typescript
// 定義郵件訊息 Port（Shared 層）
export interface IWelcomeEmailMessages {
  subject(name: string): string
  bodyTitle(name: string): string
  confirmButtonLabel(): string
}

export interface IOrderConfirmationEmailMessages {
  subject(orderId: string): string
  orderSummary(orderId: string, total: number): string
  trackingInfo(trackingId: string): string
}

// 實現（User Module + Order Module 的 Infrastructure 層）
export class WelcomeEmailMessageService implements IWelcomeEmailMessages {
  constructor(private translator: ITranslator) {}
  // ... 實現
}

export class OrderConfirmationEmailMessageService implements IOrderConfirmationEmailMessages {
  constructor(private translator: ITranslator) {}
  // ... 實現
}

// 在各模組的 Service Provider 中註冊
container.singleton('welcomeEmailMessages', (c) => {
  return new WelcomeEmailMessageService(c.make('translator'))
})

container.singleton('orderConfirmationEmailMessages', (c) => {
  return new OrderConfirmationEmailMessageService(c.make('translator'))
})
```

#### 優點
✅ **清晰的職責分離**：每種郵件有獨立的 Message Service
✅ **易於擴展**：新增郵件類型只需創建新的 Service
✅ **完全類型安全**：編譯時檢查
✅ **易於測試**：可為每種郵件獨立測試訊息

#### 缺點
❌ **代碼重複多**：多個 Service 有相似的結構
❌ **DI 容器配置複雜**：需要註冊多個 Service
❌ **文件數量增加**：每種郵件類型 1-2 個額外文件
❌ **可能過度設計**：如果郵件內容簡單，顯得臃腫

#### 適用場景
- ✅ 企業級應用，有多種複雜的郵件類型
- ✅ 郵件內容需要頻繁變更
- ✅ 多個團隊協作開發不同郵件模塊

---

### 方案 D：Two-Layer Approach

**核心概念**：分離「API 訊息層」和「Email 訊息層」

#### 實現方式

```typescript
// Layer 1: 業務層訊息（API 回應）
export interface IAuthMessages {
  loginFailed(): string
  loginSuccess(): string
}

// Layer 2: Email 訊息層（郵件內容）
export interface IEmailMessages {
  welcomeTitle(name: string): string
  confirmButtonLabel(): string
}

// 在 AuthController 中使用第 1 層
class LoginController {
  constructor(private authMessages: IAuthMessages) {}

  async login(credentials) {
    // ...
    return {
      success: true,
      message: this.authMessages.loginSuccess()  // ✅ Layer 1
    }
  }
}

// 在 EmailJob 中使用第 2 層
class SendWelcomeEmailJob {
  constructor(private emailMessages: IEmailMessages) {}

  async handle(data) {
    // ...
    const title = this.emailMessages.welcomeTitle(data.name)  // ✅ Layer 2
  }
}
```

#### 優點
✅ **明確的邊界**：清楚區分不同用途的訊息
✅ **靈活調整**：可以獨立調整 API 和 Email 訊息
✅ **團隊協作友好**：不同團隊可以獨立管理各自的訊息

#### 缺點
❌ **代碼重複高**：同樣訊息內容在兩個 Service 中重複
❌ **維護困難**：變更訊息需要在兩個地方同步
❌ **DRY 原則違反**：「不要重複自己」

#### 適用場景
- ⚠️ 只在「API 和 Email 訊息差異大」時考慮
- ❌ 對於 gravito-ddd 不推薦（過度設計，維護成本高）

---

### 方案 E：Hybrid Approach（Message Service + Translator Backup）

**核心概念**：Message Service 優先，Translator 降級備選

#### 實現方式

```typescript
export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
  constructor(
    private readonly mailer: IMailer,
    private readonly logger: ILogger,
    private readonly emailMessages?: IWelcomeEmailMessages,  // 可選
    private readonly translator?: ITranslator  // 可選
  ) {
    super()
  }

  async handle(data: SendWelcomeEmailData): Promise<void> {
    let templateData: any = { ...data }

    // 優先使用 Message Service
    if (this.emailMessages) {
      templateData.subject = this.emailMessages.subject(data.name)
      templateData.bodyTitle = this.emailMessages.bodyTitle(data.name)
    }
    // 降級到 Translator
    else if (this.translator) {
      templateData.subject = this.translator.trans('email.welcome.subject', {
        name: data.name
      })
      templateData.bodyTitle = this.translator.trans('email.welcome.body_title', {
        name: data.name
      })
    }

    await this.mailer.send({
      to: data.email,
      template: 'emails/welcome',
      data: templateData,
    })
  }
}
```

#### 優點
✅ **漸進式遷移**：無需一次性改造所有代碼
✅ **向後兼容**：舊代碼繼續工作
✅ **靈活性強**：可以根據依賴情況自動切換

#### 缺點
❌ **代碼複雜度上升**：條件邏輯增加
❌ **難以測試**：需要測試多種分支組合
❌ **可維護性下降**：需要維護兩套邏輯
❌ **容易出錯**：某個分支遺漏訊息定義

#### 適用場景
- ❌ 不推薦（複雜性高，收益低）
- ⚠️ 只在「舊系統逐步遷移」時暫時採用

---

## 本專案推薦方案

### **方案 A + 方案 C 的混合**（推薦）

#### 設計原則

1. **每種郵件類型 = 一個 Message Service**
   - 清晰的職責分離
   - 易於擴展和測試
   - 類型完全安全

2. **Message Service 應遵循 Port/Adapter 架構**
   - 定義 Port 介面（Shared 層）
   - 實現 Adapter（模組的 Infrastructure 層）
   - Job 只依賴 Port

3. **通過 Message Service 預翻譯訊息**
   - 提高 Job 代碼的清晰度
   - 模板完全無需翻譯邏輯
   - 保持 Email 模板的簡潔性

#### 目錄結構

```
src/Shared/
├── Infrastructure/
│   └── Ports/
│       └── Messages/
│           ├── IAuthMessages.ts               # 現有
│           ├── IWelcomeEmailMessages.ts       # 新增
│           ├── IOrderConfirmationEmailMessages.ts  # 新增
│           └── IPasswordResetEmailMessages.ts      # 新增

src/Modules/User/
├── Infrastructure/
│   ├── Services/
│   │   └── WelcomeEmailMessageService.ts  # 實現 IWelcomeEmailMessages
│   └── Providers/
│       └── UserServiceProvider.ts        # 註冊
```

#### 實現步驟

```typescript
// Step 1: 定義 Port（Shared 層）
// src/Shared/Infrastructure/Ports/Messages/IWelcomeEmailMessages.ts
export interface IWelcomeEmailMessages {
  subject(name: string): string
  bodyTitle(name: string): string
  welcomeMessage(name: string): string
  confirmButtonLabel(): string
  confirmationInstructions(expirationHours: number): string
}

// Step 2: 實現 Adapter（User Module Infrastructure 層）
// src/Modules/User/Infrastructure/Services/WelcomeEmailMessageService.ts
export class WelcomeEmailMessageService implements IWelcomeEmailMessages {
  constructor(private translator: ITranslator) {}

  subject(name: string): string {
    return this.translator.trans('email.welcome.subject', { name })
  }

  bodyTitle(name: string): string {
    return this.translator.trans('email.welcome.body_title', { name })
  }

  // ... 其他方法
}

// Step 3: 在 Service Provider 中註冊
// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
override register(container: IContainer): void {
  // ... 其他註冊

  container.singleton('welcomeEmailMessages', (c) => {
    const translator = c.make('translator') as ITranslator
    return new WelcomeEmailMessageService(translator)
  })
}

// Step 4: 在 Job 中使用
// src/Modules/User/Application/Jobs/SendWelcomeEmailJob.ts
export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
  constructor(
    private readonly mailer: IMailer,
    private readonly logger: ILogger,
    private readonly welcomeEmailMessages: IWelcomeEmailMessages  // ✅
  ) {
    super()
  }

  async handle(data: SendWelcomeEmailData): Promise<void> {
    const { userId, name, email } = data

    // 準備模板數據：使用 Message Service 翻譯
    const templateData = {
      name,
      email,
      subject: this.welcomeEmailMessages.subject(name),
      bodyTitle: this.welcomeEmailMessages.bodyTitle(name),
      welcomeMessage: this.welcomeEmailMessages.welcomeMessage(name),
      confirmButtonLabel: this.welcomeEmailMessages.confirmButtonLabel(),
      confirmationInstructions: this.welcomeEmailMessages.confirmationInstructions(24),
      confirmUrl: `${process.env.APP_URL}/confirm/${userId}`,
    }

    await this.mailer.send({
      to: email,
      subject: templateData.subject,
      template: 'emails/welcome',
      data: templateData,
    })
  }
}

// Step 5: 模板使用（EJS）
// views/emails/welcome.ejs
<h1><%= subject %></h1>
<h2><%= bodyTitle %></h2>
<p><%= welcomeMessage %></p>
<div class="instructions">
  <%= confirmationInstructions %>
</div>
<a href="<%= confirmUrl %>" class="btn-primary">
  <%= confirmButtonLabel %>
</a>
```

#### 整合檢查清單

- [ ] 每種郵件類型都有對應的 `IXxxEmailMessages` Port 介面
- [ ] Port 介面放在 `src/Shared/Infrastructure/Ports/Messages/` 中
- [ ] 實現放在相應模組的 `Infrastructure/Services/` 中
- [ ] 在該模組的 `ServiceProvider` 中註冊
- [ ] Job 的構造函數接收 Message Service 依賴
- [ ] Job 在 `handle()` 中預翻譯所有訊息
- [ ] 模板只接收純字符串，無任何邏輯
- [ ] 所有翻譯鍵在 JSON 文件中定義
- [ ] 編譯通過，無類型錯誤

---

## 與 gravito-ddd 架構的契合度分析

### 符合 DDD 原則

✅ **Domain 層無 i18n 依賴**
- Email 訊息完全在 Infrastructure 層處理
- Domain Entity 無需知道訊息

✅ **Application 層使用 Port/Adapter**
- Job 依賴 `IWelcomeEmailMessages` Port
- 實現由 Infrastructure 層提供

✅ **清晰的分層**
- Presentation: API 訊息（AuthMessageService）
- Application: 業務訊息（Message Service 預翻譯）
- Infrastructure: 訊息實現（WelcomeEmailMessageService）
- Domain: 無訊息邏輯

### 符合 Port/Adapter 架構

✅ **Zero Dependency**
- Module 不直接依賴特定 ORM 或翻譯庫
- Email Message Service 實現 Port 介面

✅ **可替換性**
- 如果要切換翻譯庫（現在：gravito-translator，未來：i18next）
- 只需修改 Service 實現，Job 無需改動

✅ **可測試性**
- Mock `IWelcomeEmailMessages` 即可測試 Job
- 無需 Mock `ITranslator` 的複雜邏輯

### 符合 Job Queue 設計

✅ **Background Worker 友好**
- Service Provider 在 Worker 進程中初始化
- DI 容器自動注入 Message Service
- 無需手動傳遞依賴

✅ **重試機制**
- Message Service 狀態無副作用
- 重試時訊息翻譯結果一致

---

## 實施路線圖

### Phase 1：基礎設施（Week 1）

1. 創建 `IWelcomeEmailMessages` Port 介面
2. 實現 `WelcomeEmailMessageService`
3. 在 `UserServiceProvider` 中註冊
4. 更新 `SendWelcomeEmailJob` 使用 Message Service

### Phase 2：擴展（Week 2-3）

1. 為其他郵件類型創建 Message Service：
   - `IPasswordResetEmailMessages`
   - `IOrderConfirmationEmailMessages`
   - `IAccountActivationEmailMessages`
2. 更新對應的 Job
3. 添加翻譯鍵到 locales JSON

### Phase 3：最佳實踐文檔（Week 4）

1. 創建「Email 訊息開發指南」
2. 提供代碼範本
3. 添加測試範例

---

## 常見問題解答

### Q1：如果郵件訊息參數很多怎麼辦？

**A**: 可以分組組織 Message Service 方法：

```typescript
export interface IComplexEmailMessages {
  // 標題組
  title(): string
  subtitle(): string

  // 內容組
  section1Title(): string
  section1Content(orderId: string, amount: number): string

  // 按鈕組
  primaryButtonLabel(): string
  secondaryButtonLabel(): string
}
```

### Q2：如何處理多語言郵件發送？

**A**: 在 Job 中設置 locale：

```typescript
async handle(data: SendWelcomeEmailData): Promise<void> {
  const userLocale = data.preferredLanguage || 'en'

  // 切換語言上下文
  this.translator.setLocale(userLocale)

  // Message Service 會使用當前 locale
  const subject = this.welcomeEmailMessages.subject(data.name)

  // 恢復默認語言（避免污染其他 Job）
  this.translator.setLocale('en')
}
```

### Q3：模板引擎的選擇影響嗎？

**A**: 不影響。只要模板引擎支援變數插值即可：

```ejs
<!-- EJS -->
<h1><%= subject %></h1>

<!-- Handlebars -->
<h1>{{subject}}</h1>

<!-- Nunjucks -->
<h1>{{ subject }}</h1>
```

### Q4：如何測試 Email 訊息？

**A**: Mock Message Service：

```typescript
import { describe, it, expect, mock } from 'bun:test'

describe('SendWelcomeEmailJob', () => {
  it('should use welcome email messages', async () => {
    const mockMessages = {
      subject: () => 'Welcome!',
      bodyTitle: () => 'Hello!',
      // ... 其他方法
    } as IWelcomeEmailMessages

    const job = new SendWelcomeEmailJob(
      mockMailer,
      mockLogger,
      mockMessages
    )

    await job.handle({
      userId: '1',
      name: 'John',
      email: 'john@example.com',
    })

    // 驗證郵件發送
    expect(mockMailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Welcome!',
      })
    )
  })
})
```

### Q5：需要為每個郵件創建新的 Message Service 嗎？

**A**: 是的，建議這樣做。好處：

- **單一職責**：每個 Service 只負責一種郵件
- **易於測試**：獨立的 Service 易於 Mock
- **易於擴展**：新增郵件類型只需新增 Service
- **清晰的依賴**：Job 的依賴關係明確

---

## 結論

### 最終推薦

**採用方案 A + 方案 C 的混合方案**：

1. **為每種郵件類型創建專用的 Message Service**（Port/Adapter 模式）
2. **在 Job 中注入 Message Service 並預翻譯所有訊息**（提前翻譯）
3. **模板只接收純字符串變數**（模板簡潔性）
4. **保持 Port 介面在 Shared 層**（架構一致性）

### 關鍵優勢

✅ 完全符合 DDD 和 Port/Adapter 架構
✅ 類型安全，編譯時檢查
✅ 易於測試和擴展
✅ 支持多語言和複雜參數
✅ 與現有 Message Service 設計保持一致
✅ Job Queue 和 Background Worker 友好

### 不推薦

❌ 方案 B（Template Helper Function）：損害類型安全
❌ 方案 D（Two-Layer Approach）：違反 DRY 原則
❌ 方案 E（Hybrid）：過度複雜化

---

**下一步**：按 Phase 1 實施路線圖開始實現。

