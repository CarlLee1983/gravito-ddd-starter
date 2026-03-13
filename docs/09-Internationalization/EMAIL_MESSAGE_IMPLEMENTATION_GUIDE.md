# Email 訊息實施指南

**文件版本**: 1.0
**更新日期**: 2026-03-13
**目標受眾**: gravito-ddd 開發者

---

## 快速開始（5 分鐘）

### 為你的第一個郵件類型實施 Email Message Service

#### Step 1: 定義 Port 介面（Shared 層）

創建文件：`src/Shared/Infrastructure/Ports/Messages/IWelcomeEmailMessages.ts`

```typescript
/**
 * @file IWelcomeEmailMessages.ts
 * @description 歡迎信郵件訊息 Port 介面
 *
 * 定義歡迎信中所有需要翻譯的訊息。
 * 實現應在用戶模組的 Infrastructure 層。
 */

export interface IWelcomeEmailMessages {
  /**
   * 郵件主題
   * @param name 用戶名稱
   * @example "Welcome, John!"
   */
  subject(name: string): string

  /**
   * 郵件正文標題
   * @param name 用戶名稱
   * @example "Hi John, Welcome aboard!"
   */
  bodyTitle(name: string): string

  /**
   * 歡迎訊息
   * @param name 用戶名稱
   * @example "We're thrilled to have you join our community."
   */
  welcomeMessage(name: string): string

  /**
   * 確認按鈕標籤
   * @example "Verify Your Email"
   */
  confirmButtonLabel(): string

  /**
   * 確認指示文本
   * @param expirationHours 確認鏈接過期時間（小時）
   * @example "This link will expire in 24 hours."
   */
  confirmationInstructions(expirationHours: number): string

  /**
   * 備用文本（如果無法點擊鏈接）
   * @param confirmUrl 確認鏈接 URL
   * @example "If the button above doesn't work, copy this link..."
   */
  alternativeConfirmationText(confirmUrl: string): string
}
```

#### Step 2: 實現 Service（User Module Infrastructure 層）

創建文件：`src/Modules/User/Infrastructure/Services/WelcomeEmailMessageService.ts`

```typescript
/**
 * @file WelcomeEmailMessageService.ts
 * @description 歡迎信郵件訊息實現
 *
 * 包裝 ITranslator，為歡迎信提供類型安全的訊息方法。
 * 優勢：
 * - 編譯時檢查
 * - 簡潔的方法名稱
 * - 易於測試和重構
 */

import type { IWelcomeEmailMessages } from '@/Shared/Infrastructure/Ports/Messages/IWelcomeEmailMessages'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class WelcomeEmailMessageService implements IWelcomeEmailMessages {
  constructor(private translator: ITranslator) {}

  subject(name: string): string {
    return this.translator.trans('email.welcome.subject', { name })
  }

  bodyTitle(name: string): string {
    return this.translator.trans('email.welcome.body_title', { name })
  }

  welcomeMessage(name: string): string {
    return this.translator.trans('email.welcome.message', { name })
  }

  confirmButtonLabel(): string {
    return this.translator.trans('email.welcome.confirm_button')
  }

  confirmationInstructions(expirationHours: number): string {
    return this.translator.trans('email.welcome.confirmation_instructions', {
      hours: expirationHours,
    })
  }

  alternativeConfirmationText(confirmUrl: string): string {
    return this.translator.trans('email.welcome.alternative_confirmation', {
      url: confirmUrl,
    })
  }
}
```

#### Step 3: 註冊 Service Provider（User Module）

編輯文件：`src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts`

```typescript
// 在 register() 方法末尾添加：

container.singleton('welcomeEmailMessages', (c) => {
  const translator = c.make('translator') as ITranslator
  return new WelcomeEmailMessageService(translator)
})
```

#### Step 4: 更新 Job 使用 Message Service

編輯文件：`src/Modules/User/Application/Jobs/SendWelcomeEmailJob.ts`

```typescript
import type { IWelcomeEmailMessages } from '@/Shared/Infrastructure/Ports/Messages/IWelcomeEmailMessages'

export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
  readonly jobName = 'user.send_welcome_email'
  readonly tries = 3
  readonly backoff = 60
  readonly delay = 0

  constructor(
    private readonly mailer: IMailer,
    private readonly logger: ILogger,
    private readonly welcomeEmailMessages: IWelcomeEmailMessages  // ✅ 新增
  ) {
    super()
  }

  async handle(data: SendWelcomeEmailData): Promise<void> {
    const { userId, name, email } = data

    try {
      // 準備模板數據：使用 Message Service 預翻譯所有訊息
      const templateData = {
        name,
        email,
        subject: this.welcomeEmailMessages.subject(name),
        bodyTitle: this.welcomeEmailMessages.bodyTitle(name),
        welcomeMessage: this.welcomeEmailMessages.welcomeMessage(name),
        confirmButtonLabel: this.welcomeEmailMessages.confirmButtonLabel(),
        confirmationInstructions: this.welcomeEmailMessages.confirmationInstructions(24),
        alternativeConfirmationText: this.welcomeEmailMessages.alternativeConfirmationText(
          `${process.env.APP_URL}/confirm/${userId}`
        ),
        confirmUrl: `${process.env.APP_URL}/confirm/${userId}`,
      }

      // 發送郵件
      await this.mailer.send({
        to: email,
        subject: templateData.subject,  // ✅ 使用翻譯後的主題
        template: 'emails/welcome',      // ✅ 使用模板文件
        data: templateData,               // ✅ 傳遞所有翻譯後的變數
      })

      this.logger.debug(`[User] Welcome email sent to ${email}`)
    } catch (error) {
      this.logger.error(`[User] Failed to send welcome email to ${email}`, error)
      throw error
    }
  }
}
```

#### Step 5: 添加翻譯鍵

編輯檔案：`locales/zh-TW/email.json`（新建或編輯）

```json
{
  "welcome": {
    "subject": "歡迎，:name！",
    "body_title": "嗨 :name，歡迎加入！",
    "message": "我們很高興有你加入我們的社群。",
    "confirm_button": "驗證電子郵件",
    "confirmation_instructions": "此鏈接將在 :hours 小時內過期。",
    "alternative_confirmation": "如果上面的按鈕不起作用，複製以下鏈接：:url"
  }
}
```

編輯檔案：`locales/en/email.json`

```json
{
  "welcome": {
    "subject": "Welcome, :name!",
    "body_title": "Hi :name, Welcome aboard!",
    "message": "We're thrilled to have you join our community.",
    "confirm_button": "Verify Your Email",
    "confirmation_instructions": "This link will expire in :hours hours.",
    "alternative_confirmation": "If the button above doesn't work, copy this link: :url"
  }
}
```

#### Step 6: 建立 Email 模板

創建文件：`views/emails/welcome.ejs`

```ejs
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1><%= subject %></h1>
    <h2><%= bodyTitle %></h2>

    <p><%= welcomeMessage %></p>

    <div style="margin: 30px 0;">
      <a href="<%= confirmUrl %>" class="btn">
        <%= confirmButtonLabel %>
      </a>
    </div>

    <p style="font-size: 12px; color: #666;">
      <%= confirmationInstructions %>
    </p>

    <p style="font-size: 12px; color: #999;">
      <%= alternativeConfirmationText %>
    </p>
  </div>
</body>
</html>
```

#### Step 7: 驗證

```bash
# 編譯檢查
bun run build

# 執行測試
bun test

# 啟動應用並驗證（見下面的測試指南）
bun dev
```

---

## 完整實施檢查清單

### 架構層級

- [ ] **Port 介面已定義**
  - [ ] 文件位置：`src/Shared/Infrastructure/Ports/Messages/IXxxEmailMessages.ts`
  - [ ] 所有訊息方法都有 JSDoc 註解
  - [ ] 方法簽名清晰，參數列表完整

- [ ] **Service 實現已完成**
  - [ ] 文件位置：`src/Modules/YourModule/Infrastructure/Services/XxxEmailMessageService.ts`
  - [ ] 實現了 Port 介面的所有方法
  - [ ] 所有翻譯鍵正確（與 JSON 對應）
  - [ ] 無 TypeScript 錯誤

- [ ] **Service Provider 已註冊**
  - [ ] 在 `ServiceProvider.register()` 中使用 `container.singleton()`
  - [ ] 依賴注入正確（通常是 `ITranslator`）
  - [ ] 容器鍵名清晰（建議用 `xxxEmailMessages` 格式）

### Job 層級

- [ ] **Job 已更新**
  - [ ] 構造函數接收 Message Service 依賴
  - [ ] 在 `handle()` 中預翻譯所有訊息
  - [ ] 訊息傳遞到 `mailer.send()` 的 `data` 參數
  - [ ] 無直接的 `translator.trans()` 調用（除了日誌）

- [ ] **Event Handler 已更新**
  - [ ] 如果有對應的 Handler（如 `SendWelcomeEmail`）
  - [ ] Handler 負責推送 Job 到隊列
  - [ ] Job 實例創建時正確傳遞依賴

### 翻譯層級

- [ ] **翻譯鍵已定義**
  - [ ] 文件：`locales/zh-TW/email.json`
  - [ ] 文件：`locales/en/email.json`
  - [ ] 所有鍵都有翻譯內容
  - [ ] 變數佔位符正確（格式：`:varName`）

- [ ] **翻譯鍵命名一致**
  - [ ] 格式：`email.welcomeType.messageType`
  - [ ] 例子：`email.welcome.subject`、`email.welcome.body_title`

### 模板層級

- [ ] **Email 模板已建立**
  - [ ] 文件位置：`views/emails/xxxxx.ejs`（或其他模板引擎）
  - [ ] 模板變數與 `data` 參數對應
  - [ ] HTML 結構合理，已優化郵件客戶端相容性
  - [ ] 包含備用鏈接文本（針對不支援 HTML 的客戶端）

### 測試層級

- [ ] **單元測試已編寫**
  - [ ] Message Service 翻譯邏輯測試
  - [ ] Job 呼叫 Message Service 的測試
  - [ ] 所有邊界情況都已覆蓋（參數為空、特殊字符等）

- [ ] **集成測試已編寫**
  - [ ] Job 端到端測試（含郵件發送）
  - [ ] 多語言支持測試

### 部署前

- [ ] TypeScript 編譯無錯誤 (`bun run build`)
- [ ] 所有測試通過 (`bun test`)
- [ ] 代碼審查通過
- [ ] 翻譯完整性檢查（無缺失鍵）

---

## 測試示例

### Unit Test（Message Service）

```typescript
// src/Modules/User/tests/Unit/WelcomeEmailMessageService.test.ts
import { describe, it, expect } from 'bun:test'
import { WelcomeEmailMessageService } from '../../Infrastructure/Services/WelcomeEmailMessageService'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

describe('WelcomeEmailMessageService', () => {
  const mockTranslator: ITranslator = {
    trans: (key: string, replace?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'email.welcome.subject': 'Welcome, :name!',
        'email.welcome.body_title': 'Hi :name!',
      }
      let message = translations[key] || key
      if (replace) {
        Object.entries(replace).forEach(([k, v]) => {
          message = message.replace(`:${k}`, String(v))
        })
      }
      return message
    },
    getLocale: () => 'en',
    setLocale: () => {},
  }

  it('should format subject with user name', () => {
    const service = new WelcomeEmailMessageService(mockTranslator)
    const subject = service.subject('John')
    expect(subject).toBe('Welcome, John!')
  })

  it('should format body title with user name', () => {
    const service = new WelcomeEmailMessageService(mockTranslator)
    const title = service.bodyTitle('Jane')
    expect(title).toBe('Hi Jane!')
  })
})
```

### Integration Test（Job）

```typescript
// src/Modules/User/tests/Integration/SendWelcomeEmailJob.test.ts
import { describe, it, expect } from 'bun:test'
import { SendWelcomeEmailJob, type SendWelcomeEmailData } from '../../Application/Jobs/SendWelcomeEmailJob'
import type { IMailer, MailOptions } from '@/Shared/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'
import type { IWelcomeEmailMessages } from '@/Shared/Infrastructure/Ports/Messages/IWelcomeEmailMessages'

describe('SendWelcomeEmailJob', () => {
  const mockMailer: IMailer = {
    send: async (options: MailOptions) => {
      // Mock implementation
    },
    queue: async (options: MailOptions) => {
      // Mock implementation
    },
  }

  const mockLogger: ILogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }

  const mockMessages: IWelcomeEmailMessages = {
    subject: (name) => `Welcome, ${name}!`,
    bodyTitle: (name) => `Hi ${name}!`,
    welcomeMessage: () => 'We are happy to have you.',
    confirmButtonLabel: () => 'Verify Email',
    confirmationInstructions: (hours) => `Link expires in ${hours} hours.`,
    alternativeConfirmationText: (url) => `Copy this: ${url}`,
  }

  it('should send welcome email with correct data', async () => {
    let sentOptions: MailOptions | null = null
    mockMailer.send = async (options: MailOptions) => {
      sentOptions = options
    }

    const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockMessages)
    const data: SendWelcomeEmailData = {
      userId: 'usr-123',
      name: 'John',
      email: 'john@example.com',
    }

    await job.handle(data)

    expect(sentOptions).toBeDefined()
    expect(sentOptions?.to).toBe('john@example.com')
    expect(sentOptions?.subject).toBe('Welcome, John!')
    expect(sentOptions?.data?.name).toBe('John')
  })
})
```

---

## 常見問題故障排除

### 問題 1：「Cannot find module IWelcomeEmailMessages」

**原因**：Port 介面文件路徑錯誤或拼寫

**解決方案**：
```bash
# 檢查文件是否存在
ls src/Shared/Infrastructure/Ports/Messages/I*EmailMessages.ts

# 檢查 import 路徑
# ✅ 正確：
import type { IWelcomeEmailMessages } from '@/Shared/Infrastructure/Ports/Messages/IWelcomeEmailMessages'

# ❌ 錯誤：
import type { IWelcomeEmailMessages } from '@/Shared/Ports/IWelcomeEmailMessages'
```

### 問題 2：「Service not found in container: welcomeEmailMessages」

**原因**：Service Provider 未正確註冊

**解決方案**：
```typescript
// 檢查 UserServiceProvider.register() 中是否有：
container.singleton('welcomeEmailMessages', (c) => {
  const translator = c.make('translator') as ITranslator
  return new WelcomeEmailMessageService(translator)
})
```

### 問題 3：Job 執行時找不到 Message Service

**原因**：Job 在 Worker 進程中執行，容器初始化不完整

**解決方案**：
```typescript
// 在 JobRegistry 中確保 Message Service 被註冊
// 通常自動完成，但如果失敗需要在 Service Provider 中顯式註冊

// 檢查 UserServiceProvider 是否在 ModuleAutoWirer 中被掃描
// 確保 src/Modules/User/index.ts 正確導出 IModuleDefinition
```

### 問題 4：翻譯鍵找不到

**原因**：JSON 文件中缺少對應的鍵

**解決方案**：
```bash
# 檢查翻譯鍵是否存在
grep -r "email.welcome.subject" locales/

# 確保鍵的完整路徑（用 . 分隔）
# ✅ 正確：email.welcome.subject
# ❌ 錯誤：email/welcome/subject
```

### 問題 5：郵件沒有發送

**原因**：IMailer 實現未完成（通常是 TODO）

**解決方案**：
```typescript
// src/Shared/Infrastructure/Adapters/Gravito/GravitoMailAdapter.ts
// 檢查是否已實現 send() 方法
// 如果仍是 TODO，考慮使用 nodemailer 或其他郵件庫

async send(options: MailOptions): Promise<void> {
  // 現在還是 TODO，需要整合真實郵件服務
  this.logger.info(`Sending email to ${options.to} with subject: ${options.subject}`)
  // TODO: 整合 @gravito/signal 或其他郵件服務
}
```

---

## 進階用法

### 使用帶複雜邏輯的 Message Service

```typescript
// 某些訊息需要根據條件返回不同內容
export class OrderConfirmationEmailMessageService implements IOrderConfirmationEmailMessages {
  constructor(
    private translator: ITranslator,
    private currencyFormatter: ICurrencyFormatter  // 額外依賴
  ) {}

  orderTotal(amount: number, currency: string): string {
    const formatted = this.currencyFormatter.format(amount, currency)
    return this.translator.trans('email.order.total', { amount: formatted })
  }

  estimatedDelivery(daysFromNow: number): string {
    if (daysFromNow === 0) {
      return this.translator.trans('email.order.delivery_today')
    } else if (daysFromNow === 1) {
      return this.translator.trans('email.order.delivery_tomorrow')
    } else {
      return this.translator.trans('email.order.delivery_days', { days: daysFromNow })
    }
  }
}
```

### 在 Event Handler 中直接使用 Message Service

```typescript
// 如果需要在 Event Handler（不是 Job）中使用訊息
export class SendWelcomeEmail {
  constructor(
    private readonly jobQueue: IJobQueue,
    private readonly logger: ILogger,
    private readonly welcomeEmailMessages: IWelcomeEmailMessages  // ✅ 也可注入
  ) {}

  async handle(event: UserCreated): Promise<void> {
    // 可以在這裡使用訊息
    const logMsg = this.welcomeEmailMessages.bodyTitle(event.name)
    this.logger.info(`Sending welcome email: ${logMsg}`)

    // ... 推送 Job 到隊列
  }
}
```

### 支持多語言郵件

```typescript
// 在 Job 中切換語言上下文
export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
  constructor(
    private readonly mailer: IMailer,
    private readonly logger: ILogger,
    private readonly welcomeEmailMessages: IWelcomeEmailMessages,
    private readonly translator: ITranslator  // 注入以支援多語言
  ) {
    super()
  }

  async handle(data: SendWelcomeEmailData): Promise<void> {
    const userPreferredLocale = data.preferredLocale || 'en'

    // 切換翻譯上下文
    const previousLocale = this.translator.getLocale()
    this.translator.setLocale(userPreferredLocale)

    try {
      // Message Service 會使用新的 locale
      const templateData = {
        name: data.name,
        subject: this.welcomeEmailMessages.subject(data.name),
        // ... 其他訊息
      }

      await this.mailer.send({
        to: data.email,
        subject: templateData.subject,
        template: 'emails/welcome',
        data: templateData,
      })
    } finally {
      // 恢復之前的語言設置
      this.translator.setLocale(previousLocale)
    }
  }
}
```

---

## 相關文檔

- [Email 訊息設計策略分析](./DESIGN_EMAIL_MESSAGE_STRATEGY.md) - 深度設計分析
- [Module Development Guide](./04-Module-Development/MODULE_GUIDE.md) - 模組開發指南
- [ABSTRACTION_RULES.md](./02-Architecture/ABSTRACTION_RULES.md) - 架構抽象化規則

