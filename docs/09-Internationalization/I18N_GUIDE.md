# 國際化 (i18n) 使用指南

## 概述

gravito-ddd 提供完整的多語系支援系統，基於以下架構：

- **Port**: `ITranslator` - 標準化翻譯介面
- **Adapter**: `GravitoTranslatorAdapter` - JSON 檔案加載實現
- **Locales**: `locales/{lang}/*.json` - 翻譯文件

## 目錄結構

```
locales/
├── en/
│   ├── auth.json
│   ├── common.json
│   └── ...
└── zh-TW/
    ├── auth.json
    ├── common.json
    └── ...
```

## 翻譯檔格式

使用層級化的 JSON 結構，便於組織和查找：

```json
{
  "validation": {
    "email_and_password_required": "Email and password are required"
  },
  "login": {
    "success": "Login successful",
    "failed": "Login failed",
    "invalid_credentials": "Invalid email or password"
  }
}
```

## 在 Controller 中使用

### 1. 注入 ITranslator

```typescript
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class MyController {
  constructor(
    private translator: ITranslator
  ) {}
}
```

### 2. 調用 trans() 方法

使用 **點號路徑** (dot notation) 訪問翻譯：

```typescript
// 基本用法
const message = this.translator.trans('auth.login.success')

// 替換變數
const message = this.translator.trans('auth.welcome', {
  name: 'John'
})

// 指定語言
const message = this.translator.trans('auth.login.failed', {}, 'zh-TW')
```

### 3. 實例：AuthController

```typescript
async login(ctx: IHttpContext): Promise<any> {
  try {
    const { email, password } = await ctx.getJsonBody()

    if (!email || !password) {
      return ctx.json({
        success: false,
        message: this.translator.trans('auth.validation.email_and_password_required')
      }, 400)
    }

    const sessionDto = await this.createSessionService.execute(email, password)
    return ctx.json({ success: true, data: sessionDto })
  } catch (error) {
    if (error instanceof InvalidCredentialsException) {
      return ctx.json({
        success: false,
        message: this.translator.trans('auth.login.invalid_credentials')
      }, 401)
    }

    return ctx.json({
      success: false,
      message: this.translator.trans('auth.login.failed')
    }, 500)
  }
}
```

## 在 Service Provider 中注入

在路由接線 (wireRoutes) 函數中注入 translator：

```typescript
export function wireSessionRoutes(ctx: IRouteRegistrationContext): void {
  const translator = ctx.container.make('translator') as ITranslator
  const controller = new AuthController(
    createSessionService,
    revokeSessionService,
    userProfileService,
    translator
  )
}
```

## 添加新的翻譯

### 步驟 1: 建立翻譯檔

在 `locales/{lang}/` 目錄下建立 JSON 檔案：

```json
// locales/en/product.json
{
  "created": "Product created successfully",
  "not_found": "Product not found",
  "invalid_price": "Price must be greater than 0"
}
```

### 步驟 2: 在 Code 中使用

```typescript
this.translator.trans('product.created')
this.translator.trans('product.not_found')
this.translator.trans('product.invalid_price')
```

## 支援的語言

目前支援以下語言：
- **en** - English
- **zh-TW** - Traditional Chinese (繁體中文)

### 添加新語言

1. 建立新的語言目錄：`locales/{lang}/`
2. 複製所有翻譯檔並翻譯內容
3. 在 code 中指定語言：

```typescript
this.translator.trans('auth.login.success', {}, 'ja')  // 日文
```

## 變數替換

翻譯檔支援變數替換，使用 `:varName` 格式：

```json
{
  "welcome": "Welcome, :name!",
  "order_confirmed": "Order :orderId has been confirmed"
}
```

在 code 中使用：

```typescript
this.translator.trans('welcome', { name: 'John' })
// 結果: "Welcome, John!"

this.translator.trans('order_confirmed', { orderId: '12345' })
// 結果: "Order 12345 has been confirmed"
```

## 設定當前語言

```typescript
// 在 middleware 或 context 中設定
translator.setLocale('zh-TW')

// 查詢當前語言
const currentLocale = translator.getLocale()  // 'zh-TW'
```

## 最佳實踐

### ✅ DO

- 使用層級化的命名空間：`module.feature.message`
- 所有用戶可見的訊息都使用 i18n
- 在 Application/Presentation 層使用翻譯
- 支援多個語言時維持一致的鍵名

### ❌ DON'T

- 不要硬編碼訊息
- 不要在 Domain 層使用翻譯（Domain 應該無國境）
- 不要在翻譯檔中放入邏輯或條件判斷
- 不要使用特殊符號或大寫鍵名（使用小寫和下底線）

## 測試翻譯

```typescript
describe('AuthController i18n', () => {
  it('should return translated error message', async () => {
    const translator = new GravitoTranslatorAdapter()
    expect(translator.trans('auth.login.invalid_credentials'))
      .toBe('Invalid email or password')
  })

  it('should replace variables', () => {
    const translator = new GravitoTranslatorAdapter()
    const msg = translator.trans('welcome', { name: 'John' })
    expect(msg).toBe('Welcome, John!')
  })
})
```

## 故障排查

### 找不到翻譯鍵
當翻譯檔中找不到鍵時，系統會回傳原始的鍵名。
```typescript
this.translator.trans('non.existent.key')  // 回傳: 'non.existent.key'
```

### 語言不支援
如果指定的語言不存在，系統會回退到 `en`（預設語言）。

### 找不到 locales 目錄
確保 locales 目錄位於專案根目錄，且檔案路徑正確：
```
gravito-ddd/
├── locales/          ← 必須在這裡
│   ├── en/
│   └── zh-TW/
└── app/
```

## 常見模式

### 成功/失敗訊息
```json
{
  "operations": {
    "create": {
      "success": "Created successfully",
      "failed": "Failed to create"
    },
    "update": {
      "success": "Updated successfully",
      "failed": "Failed to update"
    }
  }
}
```

### 驗證錯誤
```json
{
  "validation": {
    "required": ":field is required",
    "invalid_email": "Invalid email format",
    "min_length": ":field must be at least :min characters"
  }
}
```

### 業務邏輯錯誤
```json
{
  "errors": {
    "insufficient_balance": "Insufficient balance",
    "user_not_found": "User not found",
    "duplicate_email": "Email already registered"
  }
}
```

---

**更新於**: 2026-03-13
**支援語言**: English, Traditional Chinese
**系統**: ITranslator Port + GravitoTranslatorAdapter
