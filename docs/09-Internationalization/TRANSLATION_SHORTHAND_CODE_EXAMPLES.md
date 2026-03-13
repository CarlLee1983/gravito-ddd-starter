# 翻譯簡寫方案代碼示例與對比

本文檔展示 5 個方案的完整代碼實現和對比。

---

## 原始代碼（基準）

```typescript
// ❌ 當前狀態：冗長且容易出錯
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private translator: ITranslator
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return ctx.json({
          success: false,
          message: this.translator.trans('auth.validation.email_and_password_required'),
        }, 400)
      }

      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json({
          success: false,
          message: this.translator.trans('auth.login.invalid_credentials'),
        }, 401)
      }

      return ctx.json({
        success: false,
        message: this.translator.trans('auth.login.failed'),
      }, 500)
    }
  }
}
```

**問題統計**:
- 行數: 37
- `translator.trans()` 出現 3 次（26 字符 × 3 = 78 字符）
- 字符串鍵出現 3 次（容易拼寫錯誤）
- 無編譯時檢查

---

## 方案 1：Message Constants

### 實現

```typescript
// 1. 定義常量
// app/Shared/Infrastructure/Constants/AuthMessages.ts
export const AuthMessages = {
  VALIDATION_EMAIL_PASSWORD_REQUIRED: 'auth.validation.email_and_password_required',
  LOGIN_INVALID_CREDENTIALS: 'auth.login.invalid_credentials',
  LOGIN_FAILED: 'auth.login.failed',
} as const

// 2. 在 Controller 中使用
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private translator: ITranslator
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return ctx.json({
          success: false,
          message: this.translator.trans(AuthMessages.VALIDATION_EMAIL_PASSWORD_REQUIRED),
        }, 400)
      }

      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json({
          success: false,
          message: this.translator.trans(AuthMessages.LOGIN_INVALID_CREDENTIALS),
        }, 401)
      }

      return ctx.json({
        success: false,
        message: this.translator.trans(AuthMessages.LOGIN_FAILED),
      }, 500)
    }
  }
}
```

### 優缺點

✅ **優點**:
- 編譯時檢查（常量名稱）
- 易於重構（IDE 重命名）
- 無額外運行時開銷

❌ **缺點**:
- 常量名太長（47 字符）
- 無法檢查參數拼寫
- 仍需維護常量列表

### 評分
- 難度: ⭐ 1/5
- 收益: ⭐⭐ 2/5
- 總評: ⭐⭐ 2.5/5

---

## 方案 2A：Message Builder（鏈式）

### 實現

```typescript
// 1. 定義 Builder
// app/Shared/Infrastructure/Messages/MessageBuilder.ts
export class MessageBuilder {
  private translator: ITranslator

  constructor(translator: ITranslator) {
    this.translator = translator
  }

  auth = {
    validation: {
      emailPasswordRequired: () =>
        this.translator.trans('auth.validation.email_and_password_required'),
    },
    login: {
      invalidCredentials: () =>
        this.translator.trans('auth.login.invalid_credentials'),
      failed: () =>
        this.translator.trans('auth.login.failed'),
    },
  }
}

// 2. 在 Controller 中使用
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private messageBuilder: MessageBuilder
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return ctx.json({
          success: false,
          message: this.messageBuilder.auth.validation.emailPasswordRequired(),
        }, 400)
      }

      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json({
          success: false,
          message: this.messageBuilder.auth.login.invalidCredentials(),
        }, 401)
      }

      return ctx.json({
        success: false,
        message: this.messageBuilder.auth.login.failed(),
      }, 500)
    }
  }
}
```

### 優缺點

✅ **優點**:
- 語法相對簡潔
- 支持鏈式調用
- 編譯時檢查（相對）

❌ **缺點**:
- 仍需手動定義所有訊息
- 複雜的嵌套結構
- 必須注入 MessageBuilder

### 評分
- 難度: ⭐⭐ 2/5
- 收益: ⭐⭐⭐ 3/5
- 總評: ⭐⭐⭐ 3/5

---

## 方案 2B：Message Builder（Proxy）

### 實現

```typescript
// 1. 定義 Proxy Builder
// app/Shared/Infrastructure/Messages/ProxyMessageBuilder.ts
export class ProxyMessageBuilder {
  constructor(private translator: ITranslator) {}

  private createProxy(namespace: string): any {
    return new Proxy({}, {
      get: (target, prop: string) => {
        const key = `${namespace}.${prop}`

        // 返回函數，延遲翻譯
        return (replace?: Record<string, string | number>) => {
          return this.translator.trans(key, replace)
        }
      }
    })
  }

  get auth() {
    return this.createProxy('auth')
  }

  get user() {
    return this.createProxy('user')
  }
}

// 2. 在 Controller 中使用
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private messages: ProxyMessageBuilder
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return ctx.json({
          success: false,
          message: this.messages.auth.validation.email_and_password_required(),
        }, 400)
      }

      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json({
          success: false,
          message: this.messages.auth.login.invalid_credentials(),
        }, 401)
      }

      return ctx.json({
        success: false,
        message: this.messages.auth.login.failed(),
      }, 500)
    }
  }
}
```

### 優缺點

✅ **優點**:
- 最簡潔的語法
- 自動對應翻譯檔結構
- 無需手動定義訊息

❌ **缺點**:
- 無編譯時檢查
- 字符串鍵拼寫錯誤無法檢測
- Proxy 複雜度高，除錯困難

### 評分
- 難度: ⭐⭐⭐ 3/5
- 收益: ⭐⭐⭐⭐ 4/5
- 總評: ⭐⭐⭐⭐ 3.5/5

---

## 方案 3：Shorthand Methods

### 實現

```typescript
// 1. 定義基類
// app/Shared/Presentation/Controllers/BaseController.ts
export abstract class BaseController {
  constructor(protected translator: ITranslator) {}

  /**
   * 翻譯簡寫
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

// 2. 在 Controller 中使用
export class AuthController extends BaseController {
  constructor(
    private createSessionService: CreateSessionService,
    translator: ITranslator
  ) {
    super(translator)
  }

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return this.errorJson(ctx, 'auth.validation.email_and_password_required', 400)
      }

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

### 優缺點

✅ **優點**:
- `t()` 簡潔（5 字符）
- 減少重複代碼（`ctx.json({ success: false, ... })`）
- 易於擴展錯誤處理

❌ **缺點**:
- 仍需字符串鍵（無編譯時檢查）
- 參數無類型推斷
- 改變 Presentation 層結構

### 評分
- 難度: ⭐⭐ 2/5
- 收益: ⭐⭐⭐ 3/5
- 總評: ⭐⭐⭐ 2.5/5

---

## 方案 4：Message Service Object ⭐ 推薦

### 實現

```typescript
// 1. 定義 Port 介面
// app/Shared/Infrastructure/Ports/Messages/IAuthMessages.ts
export interface IAuthMessages {
  validationEmailPasswordRequired(): string
  loginInvalidCredentials(): string
  loginFailed(): string
}

// 2. 實現 Service
// app/Modules/Session/Infrastructure/Services/AuthMessageService.ts
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
}

// 3. 在 Service Provider 註冊
export class SessionServiceProvider implements IModuleDefinition {
  registerServices(): void {
    this.core.container.singleton('authMessages', () => {
      const translator = this.core.container.make('translator')
      return new AuthMessageService(translator)
    })
  }
}

// 4. 在 Controller 中使用
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private authMessages: IAuthMessages
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return ctx.json({
          success: false,
          message: this.authMessages.validationEmailPasswordRequired(),
        }, 400)
      }

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

// 5. 支持參數替換
export interface IUserMessages {
  welcomeEmail(name: string): string
}

export class UserMessageService implements IUserMessages {
  constructor(private translator: ITranslator) {}

  welcomeEmail(name: string): string {
    return this.translator.trans('user.welcome_email', { name })
  }
}

// 使用
const msg = this.userMessages.welcomeEmail('Carl')  // ✅ 類型檢查
```

### 優缺點

✅ **優點**:
- 編譯時檢查（方法 + 參數）
- 參數類型推斷
- DDD 分層清晰
- 易於測試
- 支持參數替換

❌ **缺點**:
- 初期編寫較長
- 每個模組需要新文件

### 評分
- 難度: ⭐⭐⭐ 3/5
- 收益: ⭐⭐⭐⭐⭐ 5/5
- 總評: ⭐⭐⭐⭐⭐ 4.5/5

---

## 方案 5：Generic Message Handler

### 實現

```typescript
// 1. 定義類型映射
// app/Shared/Infrastructure/Messages/TypedMessages.ts
type MessageMap = {
  'auth.validation.email_and_password_required': Record<never, never>
  'auth.login.invalid_credentials': Record<never, never>
  'auth.login.failed': Record<never, never>
  'user.welcome_email': { name: string }
  'order.total': { amount: number; currency: string }
}

type MessageKey = keyof MessageMap

// 2. 實現類型化 Handler
export class TypedMessageHandler {
  constructor(private translator: ITranslator) {}

  trans<K extends MessageKey>(
    key: K,
    ...[replace]: MessageMap[K] extends Record<never, never>
      ? []  // 無參數
      : [MessageMap[K]]  // 需要參數
  ): string {
    return this.translator.trans(key, replace as any)
  }
}

// 3. 在 Controller 中使用
export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private messages: TypedMessageHandler
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        // ✅ 編譯時檢查：鍵名正確 + 無參數
        return ctx.json({
          success: false,
          message: this.messages.trans('auth.validation.email_and_password_required'),
        }, 400)
      }

      const sessionDto = await this.createSessionService.execute(email, password)
      return ctx.json({ success: true, data: sessionDto })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        // ✅ 編譯時檢查：鍵名正確 + 無參數
        return ctx.json({
          success: false,
          message: this.messages.trans('auth.login.invalid_credentials'),
        }, 401)
      }

      return ctx.json({
        success: false,
        message: this.messages.trans('auth.login.failed'),
      }, 500)
    }
  }

  // ✅ 使用有參數的訊息
  async welcome(ctx: IHttpContext): Promise<any> {
    const name = ctx.get('userName') as string
    const msg = this.messages.trans('user.welcome_email', { name })
    // ...
  }

  // ❌ 編譯錯誤：缺少必要參數
  async orderTotal(ctx: IHttpContext): Promise<any> {
    // const msg = this.messages.trans('order.total')  // TS 錯誤！
    const msg = this.messages.trans('order.total', { amount: 100, currency: 'USD' })
    // ...
  }
}
```

### 優缺點

✅ **優點**:
- 完全編譯時檢查
- 鍵名 + 參數都有類型推斷
- 最嚴格的類型安全

❌ **缺點**:
- TypeScript 複雜度高
- 維護 MessageMap 繁瑣
- 編譯時間變長
- 除錯困難

### 評分
- 難度: ⭐⭐⭐⭐⭐ 5/5
- 收益: ⭐⭐⭐⭐⭐ 5/5
- 總評: ⭐⭐⭐⭐ 4/5

---

## 五種方案的代碼行數比較

```
原始代碼：                                  37 行

方案 1（Constants）：
  ├─ 常量定義                             10 行
  └─ Controller 使用                       37 行 (相同)
  總計：47 行

方案 2A（Builder 鏈式）：
  ├─ MessageBuilder 定義                  20 行
  └─ Controller 使用                       37 行 (相同)
  總計：57 行

方案 2B（Proxy Builder）：
  ├─ ProxyMessageBuilder 定義              15 行
  └─ Controller 使用                       35 行 (短 2 行)
  總計：50 行

方案 3（Shorthand Methods）：
  ├─ BaseController 定義                  15 行
  └─ Controller 使用                       28 行 (短 9 行)
  總計：43 行

方案 4（Message Service）：
  ├─ Port 介面定義                         10 行
  ├─ Service 實現                          20 行
  ├─ Service Provider 註冊                  5 行
  └─ Controller 使用                       35 行 (短 2 行)
  總計：70 行（但更清晰、更可測試）

方案 5（Generic Message Handler）：
  ├─ 類型定義                              20 行
  ├─ Handler 實現                          15 行
  └─ Controller 使用                       35 行 (相同)
  總計：70 行（複雜度最高）
```

**注**: 方案 4 雖然總行數多，但在 Module 級別重用，平均每個 Controller 更簡潔。

---

## 實際效果對比

### 方案 1（Constants）
```typescript
// 長度: 47 + 47 + 47 = 141 字符
this.translator.trans(AuthMessages.VALIDATION_EMAIL_PASSWORD_REQUIRED)
this.translator.trans(AuthMessages.LOGIN_INVALID_CREDENTIALS)
this.translator.trans(AuthMessages.LOGIN_FAILED)
```

### 方案 2A（Builder）
```typescript
// 長度: 48 + 38 + 30 = 116 字符
this.messageBuilder.auth.validation.emailPasswordRequired()
this.messageBuilder.auth.login.invalidCredentials()
this.messageBuilder.auth.login.failed()
```

### 方案 2B（Proxy）
```typescript
// 長度: 45 + 33 + 27 = 105 字符
this.messages.auth.validation.email_and_password_required()
this.messages.auth.login.invalid_credentials()
this.messages.auth.login.failed()
```

### 方案 3（Shorthand）
```typescript
// 長度: 63 + 42 + 35 = 140 字符
this.errorJson(ctx, 'auth.validation.email_and_password_required', 400)
this.errorJson(ctx, 'auth.login.invalid_credentials', 401)
this.errorJson(ctx, 'auth.login.failed', 500)
```

### 方案 4（Message Service）⭐
```typescript
// 長度: 50 + 40 + 27 = 117 字符
this.authMessages.validationEmailPasswordRequired()
this.authMessages.loginInvalidCredentials()
this.authMessages.loginFailed()
```

### 方案 5（Generic Handler）
```typescript
// 長度: 56 + 46 + 35 = 137 字符
this.messages.trans('auth.validation.email_and_password_required')
this.messages.trans('auth.login.invalid_credentials')
this.messages.trans('auth.login.failed')
```

**最短的: 方案 2B（Proxy）**
**最符合 DDD 的: 方案 4（Message Service）** ⭐

---

## 最終對比表

| 指標 | 方案1 | 方案2A | 方案2B | 方案3 | **方案4** | 方案5 |
|------|------|--------|--------|--------|----------|--------|
| **語法簡潔** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **編譯時檢查** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **參數類型推斷** | ⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **實現複雜度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **DDD 符合性** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **可測試性** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **維護成本** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ |
| **整體評分** | 2.5/5 | 3.0/5 | 3.5/5 | 2.5/5 | **4.5/5** | 4.0/5 |

---

**推薦: 方案 4（Message Service Object）**

理由：
1. 編譯時檢查完整
2. DDD 分層清晰
3. 參數類型安全
4. 易於測試
5. 長期維護成本最低

