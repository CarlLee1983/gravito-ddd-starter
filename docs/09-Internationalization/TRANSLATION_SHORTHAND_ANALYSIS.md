# 翻譯簡寫方案分析 (Translation Shorthand Design)

**目標**: 減少翻譯調用的冗長度，同時保持 DDD 架構的「零依賴」與「可注入」特性。

**當前現況**:
```typescript
// 26 字符，容易出錯，無編譯時檢查
message: this.translator.trans('auth.login.invalid_credentials')

// 含參數替換
message: this.translator.trans('user.welcome_subject', { name })
```

**約束條件**:
- ✅ Domain 層零依賴（不知道 ORM、翻譯、框架）
- ✅ 必須可注入（符合 DI 容器）
- ✅ TypeScript 編譯時檢查
- ✅ 不能使用全局 Helper
- ✅ Application/Presentation 層可有依賴

---

## 方案 1：Message Enum/Constants 方案

**實現概念**：定義類型安全的常量物件，避免字符串拼寫錯誤。

### 程式碼示例

```typescript
// Shared/Infrastructure/Constants/AuthMessages.ts
export const AuthMessages = {
  VALIDATION_EMAIL_PASSWORD_REQUIRED: 'auth.validation.email_and_password_required',
  LOGIN_INVALID_CREDENTIALS: 'auth.login.invalid_credentials',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT_SUCCESS: 'auth.logout.success',
  PROFILE_UNAUTHORIZED: 'auth.profile.unauthorized',
} as const

// AuthController.ts - 使用
async login(ctx: IHttpContext): Promise<any> {
  if (!email || !password) {
    return ctx.json({
      success: false,
      message: this.translator.trans(AuthMessages.VALIDATION_EMAIL_PASSWORD_REQUIRED),
    }, 400)
  }
}
```

### ✅ 優點
- 編譯時檢查（常量拼寫錯誤會報 TS error）
- 減少硬編碼字符串
- 易於重構（IDE 可重命名常量）
- 零運行時開銷

### ❌ 缺點
- **常量名太長** → `AuthMessages.VALIDATION_EMAIL_PASSWORD_REQUIRED` (47 字符)
- **無參數類型推斷** → 仍需 `{ name }` 魔法字串
- **維護成本** → 常量與翻譯檔不同步時無法檢查
- **仍需 translator.trans()** → 沒有真正簡化

### 🏗️ 架構影響
- 低：只是常量，不改變架構
- 創建新層級：Constants/

### 📝 實現複雜度
- 低：簡單常量定義

### 🎯 DDD 符合性
- ✅ Domain 零依賴
- ✅ 可注入
- ⚠️ 只解決了部分問題

---

## 方案 2：Message Builder 方案

**實現概念**：流暢 API，利用 TypeScript 鏈式調用。

### 程式碼示例 - 版本 A（鏈式）

```typescript
// Shared/Infrastructure/Messages/MessageBuilder.ts
export class MessageBuilder {
  private translator: ITranslator

  constructor(translator: ITranslator) {
    this.translator = translator
  }

  auth = {
    login: {
      invalidCredentials: () => this.translator.trans('auth.login.invalid_credentials'),
      failed: () => this.translator.trans('auth.login.failed'),
    },
    validation: {
      emailPasswordRequired: () => this.translator.trans('auth.validation.email_and_password_required'),
    },
  }
}

// AuthController.ts
constructor(..., messageBuilder: MessageBuilder) {
  this.messages = messageBuilder
}

async login(ctx: IHttpContext): Promise<any> {
  if (!email || !password) {
    return ctx.json({
      success: false,
      message: this.messages.auth.validation.emailPasswordRequired(),
    }, 400)
  }
}
```

### 程式碼示例 - 版本 B（Proxy）

```typescript
// 使用 TypeScript Proxy，自動對應翻譯檔結構
export class TypedMessageProxy {
  constructor(private translator: ITranslator) {}

  private createProxy(namespace: string): any {
    return new Proxy({}, {
      get: (target, prop: string) => {
        const key = `${namespace}.${prop}`
        // 如果是嵌套物件
        if (typeof prop === 'string' && prop[0] === prop[0].toLowerCase()) {
          return this.createProxy(key)
        }
        // 如果是函數呼叫
        return (replace?: Record<string, string | number>) =>
          this.translator.trans(key, replace)
      }
    })
  }

  get auth() {
    return this.createProxy('auth')
  }
}

// 使用
const msg = this.messages.auth.login.invalid_credentials()
```

### ✅ 優點（版本 A）
- 語法簡潔：`this.messages.auth.login.invalidCredentials()`
- 編譯時檢查（相對於純字符串）
- 支持參數替換：`invalidCredentials({ name: 'Carl' })`
- 無需維護常量列表

### ✅ 優點（版本 B）
- 自動對應翻譯檔結構（無需手動定義）
- 最簡潔的語法
- 支持動態命名空間

### ❌ 缺點
- **版本 A**：必須手動定義所有訊息（繁瑣）
- **版本 B**：無編譯時檢查（字符串鍵仍可能拼寫錯誤）
- **版本 B**：Proxy 複雜度較高，除錯困難
- 兩版本都需要注入 MessageBuilder

### 🏗️ 架構影響
- 中：創建新 Service (MessageBuilder)
- 需要注入到每個 Controller

### 📝 實現複雜度
- 版本 A：中
- 版本 B：高（Proxy 反射機制）

### 🎯 DDD 符合性
- ✅ Domain 零依賴
- ✅ 可注入
- ⚠️ 版本 B 仍不夠類型安全

---

## 方案 3：Shorthand Method 方案

**實現概念**：在 Controller 基類中添加 `t()` 快捷方法。

### 程式碼示例

```typescript
// Presentation/Controllers/BaseController.ts
export abstract class BaseController {
  constructor(protected translator: ITranslator) {}

  /**
   * 翻譯簡寫
   * @param key - 翻譯鍵
   * @param replace - 替換變數
   */
  protected t(key: string, replace?: Record<string, string | number>): string {
    return this.translator.trans(key, replace)
  }

  /**
   * 錯誤回應簡寫
   */
  protected errorJson(
    ctx: IHttpContext,
    messageKey: string,
    statusCode: number = 400,
    replace?: Record<string, string | number>
  ): any {
    return ctx.json({
      success: false,
      message: this.t(messageKey, replace),
    }, statusCode)
  }
}

// AuthController.ts
export class AuthController extends BaseController {
  async login(ctx: IHttpContext): Promise<any> {
    if (!email || !password) {
      return this.errorJson(ctx, 'auth.validation.email_and_password_required', 400)
    }

    try {
      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return this.errorJson(ctx, 'auth.login.invalid_credentials', 401)
      }
      return this.errorJson(ctx, 'auth.login.failed', 500)
    }
  }
}
```

### ✅ 優點
- 減少重複代碼（`ctx.json({ success: false, message: ... })` 重複）
- `this.t()` 簡潔（5 字符）
- 易於擴展錯誤回應格式

### ❌ 缺點
- **仍需字符串鍵** → 無編譯時檢查，易拼寫錯誤
- **字符串仍重複** → `'auth.login.invalid_credentials'` 出現多次
- **參數替換無類型推斷** → `{ name }` 無型別檢查
- **不符合 DDD** → Presentation 層與 Domain 層混淆

### 🏗️ 架構影響
- 低：只是基類方法
- 但創建了 BaseController 依賴

### 📝 實現複雜度
- 低：簡單基類

### 🎯 DDD 符合性
- ⚠️ 改變 Presentation 層結構
- ✅ 仍保持可注入
- ❌ 無法解決類型安全問題

---

## 方案 4：Message Service Object 方案 ⭐ 推薦

**實現概念**：為每個模組創建 Message Service，包含所有翻譯邏輯。

### 程式碼示例

```typescript
// Modules/Session/Infrastructure/Services/AuthMessageService.ts
export interface IAuthMessages {
  validationEmailPasswordRequired(): string
  loginInvalidCredentials(): string
  loginFailed(): string
  logoutSuccess(): string
  logoutFailed(): string
  profileUnauthorized(): string
  profileNotFound(): string
  profileQueryFailed(): string
}

export class AuthMessageService implements IAuthMessages {
  constructor(private translator: ITranslator) {}

  validationEmailPasswordRequired(): string {
    return this.translator.trans('auth.validation.email_and_password_required')
  }

  loginInvalidCredentials(): string {
    return this.translator.trans('auth.login.invalid_credentials')
  }

  loginFailed(): string {
    return this.translator.trans('auth.login.failed')
  }

  logoutSuccess(): string {
    return this.translator.trans('auth.logout.success')
  }

  logoutFailed(): string {
    return this.translator.trans('auth.logout.failed')
  }

  profileUnauthorized(): string {
    return this.translator.trans('auth.profile.unauthorized')
  }

  profileNotFound(): string {
    return this.translator.trans('auth.profile.not_found')
  }

  profileQueryFailed(): string {
    return this.translator.trans('auth.profile.query_failed')
  }
}

// AuthController.ts
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private revokeSessionService: RevokeSessionService,
    private userProfileService: IUserProfileService,
    private authMessages: IAuthMessages  // 注入消息服務
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

    if (!email || !password) {
      return ctx.json({
        success: false,
        message: this.authMessages.validationEmailPasswordRequired(),
      }, 400)
    }

    try {
      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json({
          success: false,
          message: this.authMessages.loginInvalidCredentials(),
        }, 401)
      }
      return ctx.json({
        success: false,
        message: this.authMessages.loginFailed(),
      }, 500)
    }
  }
}

// 版本 B：支持參數替換
export interface IAuthMessages {
  validationEmailPasswordRequired(): string
  loginInvalidCredentials(): string
  loginFailed(error?: string): string
  userWelcome(name: string): string
  // ...
}

export class AuthMessageService implements IAuthMessages {
  // ...
  loginFailed(error?: string): string {
    return error
      ? this.translator.trans('auth.login.failed', { error })
      : this.translator.trans('auth.login.failed')
  }

  userWelcome(name: string): string {
    return this.translator.trans('user.welcome_subject', { name })
  }
}

// 使用
this.authMessages.loginFailed('Database error')
this.authMessages.userWelcome('Carl')
```

### ✅ 優點
- **編譯時檢查**：方法名稱錯誤會報 TS error
- **類型安全**：參數有類型推斷（`userWelcome(name: string)`）
- **分層清晰**：Message Service 是 Port（介面），實現在 Infrastructure
- **可測試**：可注入 Mock IAuthMessages
- **DDD 符合**：Message Service 是應用層的 Port

### ❌ 缺點
- **冗長初期編寫**：需要定義許多方法
- **維護成本**：新增翻譯鍵時需更新 Service
- **可能過度設計**：如果訊息很簡單
- **文件增多**：Interface + Implementation

### 🏗️ 架構影響
- 高：創建新 Port + Service
- 符合 DDD 分層模式
- 可以在 Shared 層定義，各模組實現

### 📝 實現複雜度
- 中：需要定義 Interface 和實現

### 🎯 DDD 符合性
- ✅ Domain 零依賴
- ✅ 可注入（Port/Adapter）
- ✅ 編譯時檢查
- ✅ 應用層邏輯清晰
- ⭐ **最符合 DDD 原則**

---

## 方案 5：Generic Message Handler 方案

**實現概念**：利用 TypeScript 泛型和條件類型，創建類型化的 Message Proxy。

### 程式碼示例 - 版本 A（泛型 Factory）

```typescript
// Shared/Infrastructure/Messages/TypedMessages.ts
type MessageKey = 'auth.login.invalid_credentials' | 'auth.validation.email_and_password_required' | /* ... */

type MessageMap = {
  'auth.login.invalid_credentials': Record<never, never>  // 無參數
  'auth.validation.email_and_password_required': Record<never, never>
  'user.welcome_subject': { name: string }  // 需要 name 參數
  'order.total_amount': { amount: number }  // 需要 amount 參數
}

export class TypedMessageHandler {
  constructor(private translator: ITranslator) {}

  trans<K extends MessageKey>(
    key: K,
    ...[replace]: K extends keyof MessageMap
      ? MessageMap[K] extends Record<never, never>
        ? []  // 無參數版本
        : [MessageMap[K]]  // 需要參數版本
      : never
  ): string {
    return this.translator.trans(key, replace)
  }
}

// 使用
class AuthController {
  constructor(private messages: TypedMessageHandler) {}

  login(ctx: IHttpContext) {
    // ✅ 編譯時檢查：鍵名檢查 + 參數類型檢查
    const msg1 = this.messages.trans('auth.login.invalid_credentials')  // ✅ OK
    const msg2 = this.messages.trans('user.welcome_subject', { name: 'Carl' })  // ✅ OK

    // ❌ 編譯錯誤
    // const msg3 = this.messages.trans('auth.login.invalid_credentials', { name: 'Carl' })  // 無參數，不能傳
    // const msg4 = this.messages.trans('user.welcome_subject')  // 缺少 name 參數
  }
}
```

### 程式碼示例 - 版本 B（Branded Types）

```typescript
// 使用 Branded Types 提供更佳的 DX
type MessageKey =
  | { readonly __brand: 'auth.login.invalid_credentials'; readonly params: undefined }
  | { readonly __brand: 'user.welcome_subject'; readonly params: { name: string } }
  | /* ... */

export class TypedMessageHandler {
  trans(key: MessageKey): string {
    return this.translator.trans(
      key.__brand as string,
      key.params
    )
  }
}

// 使用
const msg = this.messages.trans({
  __brand: 'user.welcome_subject',
  params: { name: 'Carl' }
})
```

### ✅ 優點
- **完整編譯時檢查**：鍵名 + 參數類型都檢查
- **無運行時開銷**：純 TypeScript 類型檢查
- **自動參數推斷**：IDE autocomplete 會提示參數
- **DDD 符合**：Message Handler 是 Port

### ❌ 缺點
- **TypeScript 複雜度高**：條件類型、泛型複雜
- **維護成本極高**：MessageMap 與翻譯檔需同步
- **編譯時間變長**：複雜的類型計算
- **除錯困難**：TypeScript 錯誤信息複雜

### 🏗️ 架構影響
- 中：創建 TypedMessageHandler Port
- 類型定義與運行時分離

### 📝 實現複雜度
- 高：涉及高級 TS 特性（條件類型、mapped types）

### 🎯 DDD 符合性
- ✅ Domain 零依賴
- ✅ 可注入
- ✅ 編譯時檢查完整
- ⚠️ TypeScript 複雜度過高，不易維護

---

## 方案對比表

| 評估項目 | 方案 1 | 方案 2A | 方案 2B | 方案 3 | 方案 4 ⭐ | 方案 5 |
|---------|--------|---------|---------|--------|---------|--------|
| **語法簡潔度** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **編譯時檢查** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️⭐⭐ | ⚠️⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **參數類型安全** | ❌ | ⚠️ | ❌ | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **實現複雜度** | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **維護成本** | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐ | ⚠️ |
| **DDD 符合性** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **可注入性** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Domain 零依賴** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 推薦方案：方案 4 + 方案 1 混合

### 最佳實踐組合

1. **使用方案 4**（Message Service）作為主體
2. **可選配合方案 1**（Constants）防止拼寫錯誤

```typescript
// 1. 定義常量（可選，但推薦）
export const AuthMessageKeys = {
  VALIDATION_EMAIL_PASSWORD_REQUIRED: 'auth.validation.email_and_password_required',
  LOGIN_INVALID_CREDENTIALS: 'auth.login.invalid_credentials',
} as const

// 2. 定義 Port 介面
export interface IAuthMessages {
  validationEmailPasswordRequired(): string
  loginInvalidCredentials(): string
}

// 3. 實現 Service
export class AuthMessageService implements IAuthMessages {
  constructor(private translator: ITranslator) {}

  validationEmailPasswordRequired(): string {
    return this.translator.trans(AuthMessageKeys.VALIDATION_EMAIL_PASSWORD_REQUIRED)
  }

  loginInvalidCredentials(): string {
    return this.translator.trans(AuthMessageKeys.LOGIN_INVALID_CREDENTIALS)
  }
}

// 4. 使用
this.authMessages.loginInvalidCredentials()
```

### 優勢
- 編譯時檢查（方法名 + 常量）
- DDD 符合
- 可注入
- 易於測試
- 維護成本可控

---

## 進階：Automated Generation 方案

可以考慮自動生成 Message Service 基於翻譯檔：

```bash
# 不需要手動編寫所有方法，利用 code generator
bun scripts/generate-messages.ts locales/en/auth.json
# 輸出：app/Modules/Session/Infrastructure/Services/AuthMessageService.ts
```

這樣可以：
- 自動同步翻譯檔與代碼
- 減少維護成本
- 保持翻譯檔作為單一事實來源

---

## 最終建議

| 場景 | 推薦方案 | 理由 |
|------|---------|------|
| **新專案** | 方案 4 + Code Generation | 最符合 DDD，長期維護成本低 |
| **現有項目快速改進** | 方案 3 + 方案 1 | 最小改動，快速見效 |
| **對類型安全要求極高** | 方案 5 | 完整編譯時檢查，但需評估維護成本 |
| **簡單訊息系統** | 方案 1 | 足夠解決問題，無需過度設計 |
| **跨模組訊息共享** | 方案 4（在 Shared 層）| DDD 分層清晰 |

---

**建議優先實施**: **方案 4**（Message Service Object）
- 最符合 DDD 原則
- 編譯時檢查完整
- 長期維護成本最低
- 可配合 Code Generation 自動化

