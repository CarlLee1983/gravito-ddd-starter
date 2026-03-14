# 🛡️ CSRF、重試與表單防護實施指南

**狀態**: ✅ 完成 | **日期**: 2026-03-14 | **版本**: 1.0

## 📋 概述

實施三層防護機制，保護應用免受跨站攻擊、網路抖動和表單重複提交的威脅。

### 核心特性

- ✅ CSRF Token 防護（跨站請求偽造）
- ✅ 自動重試機制（網路抖動恢復）
- ✅ 表單防重複提交（防雙擊）
- ✅ 指數退避算法（智能延遲）
- ✅ 透明集成（自動化處理）

---

## 🔐 Part 1: CSRF Token 防護

### 概念

CSRF (Cross-Site Request Forgery) 防護的目的是確保狀態變化請求（POST、PUT、DELETE）來自合法用戶，而非惡意網站。

### 工作原理

```
後端流程：
  1. 生成隨機 Token
  2. 儲存 Token 到 Session
  3. 返回 Token 給前端（Meta 標籤或 Header）

前端流程：
  1. 讀取 Token 從 Meta 標籤
  2. 在狀態變化請求中附加 X-CSRF-Token header
  3. 後端驗證 Token 有效性

攻擊防護：
  - 惡意網站無法讀取 Token（同源策略保護）
  - 即使攻擊者猜測 URL，沒有 Token 也無法成功
```

### 前端使用

#### 基本函數

```typescript
import { getCsrfToken, setCsrfToken, shouldProtectRequest } from '@/utils'

// 讀取 CSRF Token
const token = getCsrfToken()
console.log('CSRF Token:', token)

// 檢查是否需要 CSRF 保護
if (shouldProtectRequest('POST')) {
  // 此方法需要 CSRF Token
}

// 手動設定新 Token（不常用）
setCsrfToken(newToken)
```

#### 自動集成（推薦）

http 工具已自動處理 CSRF Token：

```typescript
import { http } from '@/utils'

// ✅ 自動添加 CSRF Token
await http.post('/api/users', { name: 'John' })

// ❌ 不需要手動添加
// 錯誤方式：
const token = getCsrfToken()
fetch('/api/users', {
  method: 'POST',
  headers: { 'X-CSRF-Token': token }
})
```

### 後端配置

在 HTML 中添加 Meta 標籤：

```html
<!-- HTML 頭部 -->
<head>
  <!-- CSRF Token Meta 標籤（後端渲染） -->
  <meta name="csrf-token" content="<%= csrfToken %>" />
</head>
```

後端應在以下時機生成 Token：
- 頁面首次載入時
- 登入後
- 定期刷新（如 Token 過期）

### 跳過 CSRF 保護

某些端點（如公開 API）不需要 CSRF 保護：

```typescript
// 跳過 CSRF Token 檢查
await http.post('/api/public-action', data, {
  skipCsrf: true
})
```

---

## 🔄 Part 2: 自動重試機制

### 概念

網路不穩定時，某些請求可能因暫時性錯誤失敗。自動重試機制使用指數退避算法，在延遲後重新嘗試。

### 指數退避算法

```
嘗試 1：立即執行
嘗試 2：延遲 1 秒（1000ms）
嘗試 3：延遲 2 秒（2000ms）
嘗試 4：延遲 4 秒（4000ms）
...
最大延遲：30 秒

公式：delay = min(initialDelay * 2^attempt, maxDelay) + 隨機抖動
```

### 工具函數

#### retry()

基本重試函數：

```typescript
import { retry } from '@/utils'

const result = await retry(
  () => fetch('/api/data'),
  {
    maxAttempts: 3,           // 重試 3 次
    initialDelay: 1000,       // 初始延遲 1 秒
    maxDelay: 30000,          // 最大延遲 30 秒
    multiplier: 2,            // 延遲倍數
    useJitter: true,          // 添加隨機抖動
    shouldRetry: (error, attempt) => {
      // 自定義重試邏輯
      return !(error instanceof TypeError)
    }
  }
)
```

#### retryFetch()

支持 Fetch API 的重試：

```typescript
import { retryFetch } from '@/utils'

const response = await retryFetch('/api/data', {
  method: 'GET',
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000
  }
})
```

#### retryRequest()

完整的 API 重試（自動 JSON 解析）：

```typescript
import { retryRequest } from '@/utils'

const data = await retryRequest('/api/data', {
  method: 'POST',
  body: JSON.stringify({ test: true }),
  retryConfig: { maxAttempts: 3 }
})
```

### http 工具自動重試

http 工具已內置重試機制：

```typescript
import { http } from '@/utils'

// ✅ 自動重試（預設 3 次）
const result = await http.get('/api/data')

// 自定義重試配置
const result = await http.post('/api/critical', data, {
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 2000
  }
})

// 禁用重試
const result = await http.get('/api/data', {
  skipRetry: true
})
```

### 重試場景

自動重試適用於：
- ✅ 暫時性網路錯誤（離線、超時）
- ✅ 5XX 伺服器錯誤（可能暫時性）
- ✅ 3XX 重定向（有時需重試）

不應重試：
- ❌ 4XX 客戶端錯誤（400、401、403、404）
- ❌ 驗證失敗（郵件重複等）
- ❌ 資源不存在

---

## 🖱️ Part 3: 表單防重複提交

### 概念

防止用戶在提交表單時雙擊提交按鈕，導致重複請求被伺服器處理。

### useFormSubmit Hook

完整的表單管理 Hook：

```typescript
import { useFormSubmit } from '@/hooks'

const { submit, state } = useFormSubmit({
  onSubmit: async (data) => {
    return http.post('/api/users', data)
  },
  onSuccess: (data) => {
    console.log('成功！', data)
    // 重定向或顯示成功訊息
  },
  validate: (data) => {
    if (!data.email) return '郵件為必填'
    if (!data.password) return '密碼為必填'
    return null
  },
  onBeforeSubmit: (data) => {
    // 提交前的數據處理
    return { ...data, timestamp: Date.now() }
  }
})

// 使用於 React 組件
return (
  <form onSubmit={(e) => {
    e.preventDefault()
    submit(new FormData(e.currentTarget))
  }}>
    <input name="email" required />
    <input name="password" type="password" required />
    <button disabled={state.isSubmitting}>
      {state.isSubmitting ? '提交中...' : '提交'}
    </button>
    {state.error && <div className="error">{state.error}</div>}
    {state.isSuccess && <div className="success">成功提交！</div>}
  </form>
)
```

### useFormSubmitSimple Hook

簡化版本（最常見情況）：

```typescript
import { useFormSubmitSimple } from '@/hooks'

const { submit, isSubmitting, error } = useFormSubmitSimple(
  '/api/users',           // 端點 URL
  'POST',                 // HTTP 方法
  () => {                 // 成功回調
    console.log('提交成功！')
  }
)

return (
  <form onSubmit={(e) => {
    e.preventDefault()
    submit(new FormData(e.currentTarget))
  }}>
    {/* ... 表單欄位 ... */}
    <button disabled={isSubmitting}>
      {isSubmitting ? '提交中...' : '提交'}
    </button>
    {error && <div>{error}</div>}
  </form>
)
```

### 工作原理

```
用戶點擊提交按鈕
    ↓
isSubmitting = true（按鈕禁用）
    ↓
驗證表單數據
    ├─ 失敗 → 顯示錯誤，isSubmitting = false
    └─ 成功 → 繼續
    ↓
執行 onBeforeSubmit（數據轉換）
    ↓
發送請求（自動 CSRF + 重試）
    ├─ 成功 → 呼叫 onSuccess，isSuccess = true
    └─ 失敗 → 顯示錯誤，error = message
    ↓
isSubmitting = false（按鈕啟用）
    ↓
呼叫 onFinally（清理）
```

### 配置選項

| 選項 | 類型 | 說明 |
|------|------|------|
| `onSubmit` | function | 提交函數（必填） |
| `onSuccess` | function | 成功回調 |
| `onError` | function | 失敗回調 |
| `onFinally` | function | 完成回調（無論成功或失敗） |
| `validate` | function | 驗證函數（返回 error message 或 null） |
| `onBeforeSubmit` | function | 提交前的數據轉換 |

---

## 📊 整體流程

```
用戶提交表單
    ↓
useFormSubmit
  ├─ 防重複提交（isSubmitting flag）
  ├─ 表單驗證（validate function）
  ├─ 數據轉換（onBeforeSubmit）
  └─ 調用 onSubmit
      ↓
    http.post/put/patch
      ├─ CSRF Token（自動添加 X-CSRF-Token）
      ├─ Authorization（自動添加 Bearer Token）
      ├─ 重試邏輯（exponential backoff）
      └─ 錯誤處理
          ├─ 401 → 重定向到登入
          ├─ 4XX → 返回錯誤
          ├─ 5XX → 重試
          └─ 網路錯誤 → 重試
    ↓
返回結果
  ├─ 成功 → onSuccess + isSuccess
  └─ 失敗 → onError + error
```

---

## 🔧 實踐範例

### 完整表單示例

```typescript
import React from 'react'
import { useFormSubmit } from '@/hooks'
import { http } from '@/utils'

export function UserRegistrationForm() {
  const { submit, state } = useFormSubmit({
    onSubmit: async (data) => {
      return http.post('/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password
      })
    },
    validate: (data) => {
      if (!data.name) return '名字為必填'
      if (!data.email) return '郵件為必填'
      if (!data.password) return '密碼為必填'
      if (data.password.length < 8) return '密碼至少 8 個字元'
      return null
    },
    onSuccess: () => {
      // 重定向到登入頁
      window.location.href = '/login?registered=true'
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submit(new FormData(e.currentTarget))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>名字</label>
        <input name="name" type="text" required />
      </div>

      <div>
        <label>郵件</label>
        <input name="email" type="email" required />
      </div>

      <div>
        <label>密碼</label>
        <input name="password" type="password" required />
      </div>

      {state.error && (
        <div className="error-message">{state.error}</div>
      )}

      <button
        type="submit"
        disabled={state.isSubmitting}
      >
        {state.isSubmitting ? '註冊中...' : '註冊'}
      </button>

      {state.isSuccess && (
        <div className="success-message">
          註冊成功！請檢查郵件驗證。
        </div>
      )}
    </form>
  )
}
```

### 簡單表單示例

```typescript
import { useFormSubmitSimple } from '@/hooks'

export function QuickActionForm() {
  const { submit, isSubmitting, error } = useFormSubmitSimple(
    '/api/quick-action',
    'POST',
    () => alert('操作成功！')
  )

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      submit(new FormData(e.currentTarget))
    }}>
      <input name="value" placeholder="輸入值" />
      <button disabled={isSubmitting}>
        {isSubmitting ? '處理中...' : '執行'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

---

## 🐛 常見問題

### Q1: CSRF Token 遺失怎麼辦？

**A**: 檢查 HTML 中是否有 Meta 標籤：
```html
<meta name="csrf-token" content="token_value" />
```

如果遺失，後端應在渲染 HTML 時添加。

### Q2: 重試是否安全？

**A**: 安全的條件：
- ✅ GET 請求（天然冪等）
- ✅ POST 到支持冪等性的端點（例如銀行轉帳會檢查交易 ID）
- ❌ POST 到不支持冪等性的端點（可能導致重複操作）

### Q3: 如何禁用特定請求的重試？

```typescript
await http.post('/api/critical', data, {
  skipRetry: true
})
```

### Q4: 表單驗證失敗時如何處理？

驗證失敗會阻止提交，並在 `state.error` 中返回錯誤訊息：

```typescript
const { state } = useFormSubmit({
  validate: (data) => {
    if (!data.email) return '郵件為必填'
    return null
  }
})

// state.error 會包含 '郵件為必填'
```

---

## 📚 相關文檔

- [TOKEN_MANAGEMENT.md](./TOKEN_MANAGEMENT.md) - Phase 1: Token 管理
- [TOKEN_AUTO_REFRESH.md](./TOKEN_AUTO_REFRESH.md) - Phase 2: Token 刷新
- [MIDDLEWARE_GUIDE.md](./MIDDLEWARE_GUIDE.md) - 後端 Middleware

---

## ✅ 實施檢查清單

- [x] CSRF Token 工具（csrf.ts）
- [x] 自動重試機制（retry.ts）
- [x] 表單提交 Hook（useFormSubmit.ts）
- [x] http 工具集成 CSRF + 重試
- [x] 完整文檔
- [x] 使用範例
- [x] 常見問題解答

---

**最後更新**: 2026-03-14

**下一步**:
- [ ] 後端 CSRF Token 生成實施
- [ ] 會話超時警告提示
- [ ] 表單自動保存（草稿功能）
- [ ] 樂觀更新（即時 UI 反饋）
