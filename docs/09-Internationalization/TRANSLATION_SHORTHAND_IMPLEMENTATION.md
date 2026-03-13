# 翻譯簡寫實施指南（方案 4：Message Service Object）

本指南展示如何在 gravito-ddd 中實施推薦的翻譯簡寫方案。

---

## 目標

將現有的翻譯調用：
```typescript
message: this.translator.trans('auth.login.invalid_credentials')
```

簡化為：
```typescript
message: this.authMessages.loginInvalidCredentials()
```

同時保持：
- ✅ 編譯時檢查
- ✅ DDD 分層清晰
- ✅ 可注入性
- ✅ 易於測試

---

## 實施步驟

### Step 1：定義 Message Port 介面（Shared 層）

在 `app/Shared/Infrastructure/Ports/Messages/` 目錄中創建介面：

```typescript
// app/Shared/Infrastructure/Ports/Messages/IAuthMessages.ts
/**
 * @file IAuthMessages.ts
 * @description 認證模組訊息 Port 介面
 *
 * 定義所有認證相關的使用者訊息。
 * 實現應在對應模組的 Infrastructure 層。
 */

export interface IAuthMessages {
  /**
   * 驗證錯誤：郵箱和密碼必填
   */
  validationEmailPasswordRequired(): string

  /**
   * 登入失敗：無效的認證信息
   */
  loginInvalidCredentials(): string

  /**
   * 登入失敗：通用錯誤
   */
  loginFailed(): string

  /**
   * 登出成功
   */
  logoutSuccess(): string

  /**
   * 登出失敗
   */
  logoutFailed(): string

  /**
   * 授權失敗：用戶未認證
   */
  profileUnauthorized(): string

  /**
   * 用戶不存在
   */
  profileNotFound(): string

  /**
   * 查詢用戶失敗
   */
  profileQueryFailed(): string
}
```

### Step 2：實現 Message Service（Module Infrastructure 層）

在 `app/Modules/Session/Infrastructure/Services/` 中創建實現：

```typescript
// app/Modules/Session/Infrastructure/Services/AuthMessageService.ts
/**
 * @file AuthMessageService.ts
 * @description 認證訊息服務實現
 */

import type { IAuthMessages } from '@/Shared/Infrastructure/Ports/Messages/IAuthMessages'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

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
```

### Step 3：在 Service Provider 中註冊

修改 `app/Modules/Session/Infrastructure/Providers/SessionServiceProvider.ts`：

```typescript
// app/Modules/Session/Infrastructure/Providers/SessionServiceProvider.ts
import type { ICore } from '@gravito/core'
import type { IModuleDefinition } from '@/Shared/Infrastructure/IModuleDefinition'
import type { IAuthMessages } from '@/Shared/Infrastructure/Ports/Messages/IAuthMessages'
import { AuthMessageService } from '../Services/AuthMessageService'
// ... 其他 import

export class SessionServiceProvider implements IModuleDefinition {
  constructor(private core: ICore) {}

  registerRepositories(): void {
    // 現有的 Repository 註冊...
  }

  registerServices(): void {
    // 新增：註冊 Message Service
    this.core.container.singleton('authMessages', () => {
      const translator = this.core.container.make('translator')
      return new AuthMessageService(translator)
    })

    // 也可以綁定到介面（推薦做法）
    this.core.container.bind(
      'IAuthMessages',
      () => this.core.container.make('authMessages')
    )
  }

  registerRoutes(router: any): void {
    // 現有的路由註冊...
  }
}
```

### Step 4：修改 Controller 以注入 Message Service

```typescript
// app/Modules/Session/Presentation/Controllers/AuthController.ts
/**
 * @file AuthController.ts
 * @description 認證控制器（已優化翻譯調用）
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IAuthMessages } from '@/Shared/Infrastructure/Ports/Messages/IAuthMessages'
import { CreateSessionService } from '../../Application/Services/CreateSessionService'
import { RevokeSessionService } from '../../Application/Services/RevokeSessionService'
import { InvalidCredentialsException } from '../../Domain/Exceptions/InvalidCredentialsException'
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'

export class AuthController {
  constructor(
    private createSessionService: CreateSessionService,
    private revokeSessionService: RevokeSessionService,
    private userProfileService: IUserProfileService,
    private authMessages: IAuthMessages  // ✨ 注入 Message Service
  ) {}

  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      // ✨ 簡化的訊息調用
      if (!email || !password) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.validationEmailPasswordRequired(),
          },
          400
        )
      }

      const sessionDto = await this.createSessionService.execute(email, password)

      return ctx.json({
        success: true,
        data: sessionDto,
      })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.loginInvalidCredentials(),
          },
          401
        )
      }

      console.error('[AuthController.login] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.loginFailed(),
        },
        500
      )
    }
  }

  async logout(ctx: IHttpContext): Promise<any> {
    try {
      const token = this.extractTokenFromHeader(ctx)
      if (!token) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.profileUnauthorized(),
          },
          401
        )
      }

      await this.revokeSessionService.execute(token)

      return ctx.json({
        success: true,
        message: this.authMessages.logoutSuccess(),
      })
    } catch (error) {
      console.error('[AuthController.logout] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.logoutFailed(),
        },
        500
      )
    }
  }

  async me(ctx: IHttpContext): Promise<any> {
    try {
      const userId = ctx.get('authenticatedUserId') as string | undefined
      if (!userId) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.profileUnauthorized(),
          },
          401
        )
      }

      const userProfile = await this.userProfileService.findById(userId)
      if (!userProfile) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.profileNotFound(),
          },
          404
        )
      }

      return ctx.json({
        success: true,
        data: userProfile,
      })
    } catch (error) {
      console.error('[AuthController.me] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.profileQueryFailed(),
        },
        500
      )
    }
  }

  private extractTokenFromHeader(ctx: IHttpContext): string | null {
    const authHeader = ctx.getHeader('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.slice(7)
  }
}
```

---

## 進階：支持參數替換

如果需要動態參數，可以擴展介面：

```typescript
// app/Shared/Infrastructure/Ports/Messages/IUserMessages.ts
export interface IUserMessages {
  welcomeEmail(name: string): string
  userCreatedLog(userId: string): string
  welcomeSubject(name: string, date: string): string
}

// app/Modules/User/Infrastructure/Services/UserMessageService.ts
export class UserMessageService implements IUserMessages {
  constructor(private translator: ITranslator) {}

  welcomeEmail(name: string): string {
    return this.translator.trans('user.welcome_email', { name })
  }

  userCreatedLog(userId: string): string {
    return this.translator.trans('user.created_log', { id: userId })
  }

  welcomeSubject(name: string, date: string): string {
    return this.translator.trans('user.welcome_subject', { name, date })
  }
}

// 使用
const msg = this.userMessages.welcomeEmail('Carl')
const logMsg = this.userMessages.userCreatedLog(userId)
```

---

## 可選：自動化代碼生成

可以創建一個 script 自動生成 Message Service 基於翻譯檔：

```typescript
// scripts/generate-messages.ts
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * 從翻譯檔自動生成 Message Service
 *
 * 用法：
 *   bun scripts/generate-messages.ts auth
 *   # 輸出：app/Modules/Session/Infrastructure/Services/AuthMessageService.ts
 */

const module = process.argv[2] || 'auth'
const localesPath = resolve(process.cwd(), 'locales/en')

const translationFile = resolve(localesPath, `${module}.json`)
const content = readFileSync(translationFile, 'utf-8')
const messages = JSON.parse(content)

// 生成介面和實現
let interfaceCode = `export interface I${capitalize(module)}Messages {\n`
let implementationCode = `export class ${capitalize(module)}MessageService implements I${capitalize(module)}Messages {\n`
implementationCode += `  constructor(private translator: ITranslator) {}\n\n`

function flattenKeys(obj: any, prefix = ''): { key: string; path: string }[] {
  const result: { key: string; path: string }[] = []

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    const methodName = toMethodName(key)

    if (typeof value === 'object') {
      result.push(...flattenKeys(value, path))
    } else {
      result.push({ key: methodName, path })
    }
  }

  return result
}

const keys = flattenKeys(messages)

keys.forEach(({ key, path }) => {
  interfaceCode += `  ${key}(): string\n`
  implementationCode += `  ${key}(): string {\n`
  implementationCode += `    return this.translator.trans('${path}')\n`
  implementationCode += `  }\n\n`
})

interfaceCode += `}\n`
implementationCode += `}\n`

// 輸出完整檔案
const output = `/**
 * @file ${capitalize(module)}MessageService.ts
 * @description ${capitalize(module)} 訊息服務（自動生成）
 */

import type { I${capitalize(module)}Messages } from '@/Shared/Infrastructure/Ports/Messages/I${capitalize(module)}Messages'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

${interfaceCode}

${implementationCode}`

console.log(output)

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function toMethodName(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
```

使用：
```bash
bun scripts/generate-messages.ts auth > app/Modules/Session/Infrastructure/Services/AuthMessageService.ts
```

---

## 測試

Message Service 易於測試：

```typescript
// tests/Unit/Modules/Session/AuthMessageService.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { AuthMessageService } from '@/Modules/Session/Infrastructure/Services/AuthMessageService'

describe('AuthMessageService', () => {
  let service: AuthMessageService
  let mockTranslator: any

  beforeEach(() => {
    mockTranslator = {
      trans: (key: string, replace?: Record<string, string | number>) => {
        const messages: Record<string, string> = {
          'auth.login.invalid_credentials': 'Invalid email or password',
          'auth.validation.email_and_password_required': 'Email and password are required',
        }
        return messages[key] || key
      }
    }

    service = new AuthMessageService(mockTranslator)
  })

  it('should return login invalid credentials message', () => {
    const msg = service.loginInvalidCredentials()
    expect(msg).toBe('Invalid email or password')
  })

  it('should return validation message', () => {
    const msg = service.validationEmailPasswordRequired()
    expect(msg).toBe('Email and password are required')
  })
})
```

---

## 遷移檢查清單

對現有 Controller 進行遷移：

- [ ] 定義 Message Port 介面
- [ ] 實現 Message Service
- [ ] 在 Service Provider 註冊
- [ ] 修改 Controller constructor 注入 Message Service
- [ ] 將所有 `this.translator.trans()` 替換為對應方法
- [ ] 執行現有測試確保功能無變化
- [ ] 添加 Message Service 的單元測試

---

## 與其他層的互動

### Domain 層
✅ Domain 層不需要改變（完全無依賴）

```typescript
// Domain 層仍然拋出異常，不處理訊息
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid credentials')  // 簡單內部訊息
  }
}
```

### Application 層
✅ Application 層不知道 Message Service

```typescript
// Application 層只知道業務邏輯，訊息處理由 Presentation 層負責
export class CreateSessionService {
  async execute(email: string, password: string): Promise<SessionDTO> {
    // ... 驗證邏輯
    if (!user) {
      throw new InvalidCredentialsException()  // 拋出異常
    }
  }
}
```

### Presentation 層
✅ Presentation 層使用 Message Service

```typescript
// Presentation 層捕獲異常，使用 Message Service 返回用戶訊息
async login(ctx: IHttpContext): Promise<any> {
  try {
    const sessionDto = await this.createSessionService.execute(email, password)
    return ctx.json({ success: true, data: sessionDto })
  } catch (error) {
    if (error instanceof InvalidCredentialsException) {
      return ctx.json({
        success: false,
        message: this.authMessages.loginInvalidCredentials(),  // ✨ Message Service
      }, 401)
    }
  }
}
```

---

## 優勢總結

| 優勢 | 說明 |
|------|------|
| **編譯時檢查** | 方法名稱錯誤在編譯時報錯 |
| **參數類型安全** | `welcomeEmail(name: string)` 強制參數類型 |
| **DDD 分層** | Message Service 是 Presentation 層的 Port |
| **易於測試** | 可注入 Mock Message Service |
| **易於維護** | 訊息邏輯集中在一個地方 |
| **可重用** | 同一訊息可被多個 Controller 使用 |
| **支持參數替換** | 方法簽名直接表達參數需求 |

