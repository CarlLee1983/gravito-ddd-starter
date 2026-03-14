# 🔐 前端 Token 管理實施指南

**狀態**: ✅ 完成 | **日期**: 2026-03-14 | **版本**: 1.0

## 📋 概述

本文檔說明如何使用前端 Token 管理系統，自動處理認證、授權和會話管理。

### 核心特性

- ✅ 雙層存儲策略（Cookie + localStorage）
- ✅ 自動 Authorization Header 注入
- ✅ 401 未授權自動重定向
- ✅ Token 過期檢測
- ✅ 統一的 API 層

---

## 📂 檔案結構

```
resources/js/
├── utils/
│   ├── tokenManager.ts        # Token 管理工具（存儲、提取、清除）
│   ├── http.ts                # HTTP 請求工具（自動 Authorization）
│   └── index.ts               # 工具導出
├── services/
│   └── api.ts                 # API 服務層（業務邏輯）
├── contexts/
│   └── AuthContext.tsx        # 認證上下文（已更新使用 tokenManager）
└── hooks/
    └── useAuth.ts             # 認證 Hook
```

---

## 🔧 使用指南

### 1️⃣ Token 管理工具 (tokenManager.ts)

#### 基本操作

```typescript
import {
  getToken,           // 取得有效 Token
  setTokenStorage,    // 保存 Token 到 localStorage
  clearToken,         // 清除所有 Token（Cookie + localStorage）
  isTokenValid,       // 檢查 Token 是否有效
  isTokenExpiringSoon // 檢查 Token 是否即將過期
} from '@/utils/tokenManager'

// 取得 Token
const token = getToken()
console.log('當前 Token:', token)

// 檢查 Token 有效性
if (isTokenValid()) {
  console.log('Token 有效')
}

// 檢查是否即將過期（5 分鐘內）
if (isTokenExpiringSoon(5)) {
  console.log('Token 即將過期，應該刷新')
}

// 清除 Token（登出時調用）
clearToken()
```

#### 詳細 API

| 函數 | 用途 | 返回值 |
|------|------|--------|
| `getToken()` | 取得有效 Token（localStorage 優先） | `string \| null` |
| `getTokenFromCookie()` | 從 Cookie 讀取 Token | `string \| null` |
| `getTokenFromStorage()` | 從 localStorage 讀取 Token | `string \| null` |
| `setTokenStorage(token, expiresIn)` | 保存 Token 到 localStorage | `void` |
| `setTokenCookie(token, days)` | 設定 Cookie Token | `void` |
| `clearToken()` | 清除所有 Token | `void` |
| `isTokenValid()` | 檢查 Token 格式有效性 | `boolean` |
| `decodeToken(token)` | 解碼 JWT（不驗證簽名） | `object \| null` |
| `isTokenExpiringSoon(minutes)` | 檢查是否即將過期 | `boolean` |

---

### 2️⃣ HTTP 請求工具 (http.ts)

#### 自動 Authorization

```typescript
import { http } from '@/utils'

// ✅ 自動添加 Authorization header
const response = await http.get('/api/users/123')

// GET 請求
const users = await http.get('/api/users')

// POST 請求
const result = await http.post('/api/orders', {
  items: [/* ... */],
  totalAmount: 99.99
})

// PUT 更新
const updated = await http.put('/api/users/123', {
  name: 'New Name'
})

// DELETE 刪除
await http.delete('/api/posts/456')
```

#### 錯誤處理

```typescript
const response = await http.get('/api/protected')

if (!response.success) {
  console.error('請求失敗:', response.message)
  // 錯誤已被自動捕獲和記錄
}

// 自定義 401 處理
await http.get('/api/protected', {
  onUnauthorized: () => {
    console.log('Token 無效，執行自定義處理')
    // 自定義邏輯...
  }
})

// 跳過自動 Authorization（用於公開端點）
await http.get('/api/products', {
  skipAuth: true
})
```

#### HTTP 方法

```typescript
// GET
await http.get(url, options)

// POST
await http.post(url, body, options)

// PUT
await http.put(url, body, options)

// PATCH
await http.patch(url, body, options)

// DELETE
await http.delete(url, options)

// 自定義（完全控制）
await http.request(url, options)
```

---

### 3️⃣ API 服務層 (api.ts)

統一的 API 調用層，自動使用 http 工具：

```typescript
import {
  userApi,
  cartApi,
  orderApi,
  productApi,
  postApi,
  paymentApi
} from '@/services/api'

// 用戶 API
const me = await userApi.getMe()
const user = await userApi.getById('user-123')

// 購物車 API
await cartApi.addItem({ productId: 'prod-1', quantity: 2 })
const checkout = await cartApi.checkout()

// 訂單 API
const orders = await orderApi.getAll()
const analytics = await orderApi.getAnalytics()

// 產品 API
const products = await productApi.getAll()
const search = await productApi.search('apple')

// 文章 API
const posts = await postApi.getAll()
await postApi.create({ title: '新文章', content: '內容...' })

// 支付 API
await paymentApi.initiate({
  orderId: 'order-123',
  amount: 99.99,
  method: 'credit_card'
})
```

---

### 4️⃣ 在 React 組件中使用

#### 簡單讀取（無需認證）

```typescript
import { http } from '@/utils'

export function ProductList() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    http.get('/api/products', { skipAuth: true })
      .then(res => {
        if (res.success) setProducts(res.data)
      })
  }, [])

  return <div>{/* 渲染產品列表 */}</div>
}
```

#### 受保護資源（需要認證）

```typescript
import { useAuth } from '@/hooks/useAuth'
import { http } from '@/utils'

export function UserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (user) {
      // http 自動添加 Authorization
      http.get(`/api/users/${user.id}`)
        .then(res => {
          if (res.success) setProfile(res.data)
        })
    }
  }, [user])

  if (!user) return <div>請先登入</div>

  return <div>{/* 渲染用戶資料 */}</div>
}
```

#### 提交表單（認證 + 上傳）

```typescript
import { useAuth } from '@/hooks/useAuth'
import { http } from '@/utils'

export function CreatePost() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await http.post('/api/posts', {
      title: formData.get('title'),
      content: formData.get('content')
    })

    if (result.success) {
      alert('文章已發佈')
      // 重定向或刷新...
    } else {
      alert(`發佈失敗: ${result.message}`)
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit" disabled={loading}>
        {loading ? '發佈中...' : '發佈'}
      </button>
    </form>
  )
}
```

---

## 🔄 認證流程

```
用戶訪問頁面
      ↓
AuthProvider 初始化
  ├─ 從 localStorage/Cookie 讀取 Token
  ├─ 呼叫 /api/auth/me 驗證
  └─ 設置用戶狀態
      ↓
頁面組件挂載
  ├─ useAuth() 取得用戶狀態
  ├─ 根據 isAuthenticated 顯示內容
  └─ 使用 http 發起 API 請求
      ↓
http 工具自動：
  ├─ 從 Token 管理器取得 Token
  ├─ 添加 Authorization header
  ├─ 執行請求
  └─ 如果 401，清除 Token 並重定向
```

---

## 🛡️ 安全最佳實踐

### ✅ 推薦做法

```typescript
// 1. 優先使用 localStorage（最新的 Token）
const token = getToken()

// 2. 自動 Authorization（使用 http 工具）
await http.get('/api/protected')

// 3. 檢查 Token 過期
if (isTokenExpiringSoon(5)) {
  // 刷新 Token 邏輯...
}

// 4. 登出時清除所有 Token
clearToken()

// 5. 在 AuthContext 中管理認證狀態
const { user, isAuthenticated } = useAuth()
```

### ❌ 避免做法

```typescript
// ❌ 直接訪問 localStorage
const token = localStorage.getItem('auth_token')

// ❌ 手動添加 Header（使用 http 工具替代）
fetch('/api/protected', {
  headers: { Authorization: `Bearer ${token}` }
})

// ❌ 在 localStorage 存儲敏感信息以外的內容
localStorage.setItem('sensitive_data', JSON.stringify(userData))

// ❌ 忽視 401 響應
// （http 工具會自動處理）
```

---

## 📊 Token 存儲策略

| 策略 | 位置 | 優點 | 缺點 |
|------|------|------|------|
| **HTTP-Only Cookie** | 瀏覽器 Cookie | XSS 防護、自動發送 | 前端 JS 無法訪問 |
| **localStorage** | 瀏覽器存儲 | 前端 JS 可訪問、易於管理 | XSS 易被竊取 |
| **Memory** | JavaScript 記憶體 | 最安全（JS 無法盜竊） | 頁面刷新丟失 |

**推薦組合**:
- SSR 頁面：使用 HTTP-Only Cookie（由後端設定）
- SPA 前端：使用 localStorage（更靈活）
- 並行使用：Cookie 用於頁面加載，localStorage 用於前端 JS 請求

---

## 🐛 常見問題

### Q1: 如何實現 Token 自動刷新？

```typescript
export function useTokenRefresh() {
  useEffect(() => {
    const checkAndRefresh = async () => {
      if (isTokenExpiringSoon(5)) {
        const response = await http.post('/api/auth/refresh')
        if (response.success && response.data?.accessToken) {
          setTokenStorage(response.data.accessToken)
        }
      }
    }

    const interval = setInterval(checkAndRefresh, 60000) // 每分鐘檢查
    return () => clearInterval(interval)
  }, [])
}
```

### Q2: 401 自動重定向如何禁用？

```typescript
// 跳過自動 401 處理
const response = await http.get('/api/check-auth', {
  onUnauthorized: () => {
    // 自定義処理，不重定向
    console.log('無效 Token')
  }
})
```

### Q3: 如何在 API 層面測試受保護端點？

```typescript
// 使用 Authorization header
const response = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${validToken}`
  }
})
```

---

## 📚 相關文檔

- [MIDDLEWARE_GUIDE.md](./MIDDLEWARE_GUIDE.md) - 後端 Middleware 配置
- [../types/frontend/contexts.d.ts](../types/frontend/contexts.d.ts) - 類型定義
- [../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md) - 架構設計

---

**最後更新**: 2026-03-14

**下一步**:
- [ ] 實現 Token 自動刷新機制
- [ ] 添加請求重試邏輯（失敗重試）
- [ ] 實現 CSRF Token 保護
- [ ] 添加請求去重（防止重複提交）
