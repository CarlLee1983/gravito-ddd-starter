# 🔐 Middleware 設定與前端頁面保護指南

**最後更新**: 2026-03-14 | **Middleware 數量**: 3 個 | **前端頁面**: 12 個

---

## 🎯 概述

本指南說明如何使用 middleware 系統保護前端頁面，並與後端 API 進行安全的認證與授權整合。

### 三層防護架構

```
┌─────────────────────────────────────┐
│      前端頁面 (React Pages)          │
│  ├─ Dashboard (認證必須)            │
│  ├─ Login (公開，已認證時重定向)    │
│  ├─ Register (公開)                 │
│  └─ Order, Cart, Product (認證頁)   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      Middleware 層 (3 種)            │
│  1. PageGuardMiddleware             │
│     └─ 保護頁面路由                 │
│  2. JwtGuardMiddleware              │
│     └─ 保護 API 端點                │
│  3. ExceptionHandlingMiddleware     │
│     └─ 統一錯誤處理                 │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      認證系統 (JWT + Cookie)        │
│  ├─ Token 生成                      │
│  ├─ Token 驗證                      │
│  └─ Session 管理                    │
└─────────────────────────────────────┘
```

---

## 📦 Middleware 詳解

### 1️⃣ **PageGuardMiddleware** - 頁面路由保護

**用途**: 保護 SSR 頁面路由（如 `/dashboard`、`/order`）

**位置**: `app/Foundation/Presentation/Middlewares/PageGuardMiddleware.ts`

**特點**:
- ✅ 從 Authorization Header 或 Cookie 提取 Token
- ✅ 認證失敗時**重定向到登入頁** (不返回 JSON)
- ✅ 認證成功時設定 `ctx.authenticatedUserId`

**使用示例**:

```typescript
// 在路由中使用
router.get('/dashboard', [pageGuardMiddleware], async (ctx) => {
  const userId = ctx.get('authenticatedUserId')
  return ctx.render('Dashboard', { userId })
})
```

**工作流程**:

```
用戶訪問 /dashboard
      ↓
PageGuardMiddleware 驗證 Token
      ↓
Token 有效? ──YES─→ 設定 authenticatedUserId → 繼續
      │
      NO
      ↓
   重定向到 /login
```

---

### 2️⃣ **JwtGuardMiddleware** - API 路由保護

**用途**: 保護 REST API 端點（如 `POST /api/auth/login`）

**位置**: `app/Foundation/Presentation/Middlewares/JwtGuardMiddleware.ts`

**特點**:
- ✅ 驗證 Bearer Token (Authorization Header)
- ✅ 認證失敗時返回 **401 JSON 錯誤**
- ✅ 適用於 API 調用（前端 JS 請求）

**使用示例**:

```typescript
// 在 API 路由中使用
router.post('/api/users/:id/update', [jwtGuardMiddleware], async (ctx) => {
  const userId = ctx.get('authenticatedUserId')
  // 更新用戶資料
  return ctx.json({ success: true })
})
```

**工作流程**:

```
前端發起 API 請求
  Headers: { Authorization: 'Bearer <token>' }
      ↓
JwtGuardMiddleware 驗證 Token
      ↓
Token 有效? ──YES─→ 設定 authenticatedUserId → 繼續
      │
      NO
      ↓
返回 401 JSON { success: false, message: '無效或過期的 Token' }
```

---

### 3️⃣ **ExceptionHandlingMiddleware** - 全局異常處理

**用途**: 統一捕獲並轉換應用異常為 HTTP 響應

**位置**: `app/Foundation/Presentation/Middlewares/ExceptionHandlingMiddleware.ts`

**特點**:
- ✅ 自動捕獲 `DomainException` 及子類
- ✅ 返回統一的 JSON 錯誤格式
- ✅ 無需在 Controller 中手動 try-catch

**使用示例**:

```typescript
// 在路由中使用（通常包裝整個路由群組）
router.get('/api/users', [exceptionHandlingMiddleware], async (ctx) => {
  // 如果拋出異常，middleware 會自動捕獲
  throw new ValidationException('Invalid request')
  // 會自動轉換為: { success: false, message: 'Invalid request', statusCode: 400 }
})
```

**支援的異常類型**:

```typescript
// DomainException 及其子類會被自動映射

✅ DomainException          → 400 Bad Request
✅ ValidationException      → 400 Bad Request
✅ EntityNotFoundException  → 404 Not Found
✅ DuplicateEntityException → 409 Conflict
✅ 其他 Error              → 500 Internal Server Error
```

---

## 🔗 前端頁面與 Middleware 的整合

### 當前頁面結構

```
resources/js/Pages/
├── Auth/
│   ├── Login.tsx            (公開頁面)
│   ├── Register.tsx         (公開頁面)
│   └── Dashboard.tsx        (受保護)
├── User/                    (受保護)
├── Product/                 (受保護)
├── Cart/                    (受保護)
├── Order/                   (受保護)
├── Payment/                 (受保護)
├── Post/                    (受保護)
├── Health/                  (受保護)
├── Welcome.tsx              (公開首頁)
└── Dashboard.tsx            (主儀表板，受保護)
```

### 頁面路由配置示例

**Auth 模組的路由配置** (`app/Modules/Auth/Presentation/Routes/pages.ts`):

```typescript
// 公開頁面（不需要 middleware）
router.get('/login', [], async (ctx) => {
  return ctx.render('Auth/Login')
})

router.get('/register', [], async (ctx) => {
  return ctx.render('Auth/Register')
})

// 受保護頁面（使用 PageGuardMiddleware）
const dashboardMiddlewares = pageGuardMiddleware ? [pageGuardMiddleware] : []
router.get('/dashboard', dashboardMiddlewares, async (ctx) => {
  const userId = ctx.get('authenticatedUserId')
  return ctx.render('Dashboard')
})
```

---

## 🛡️ 前端-後端安全流程

### 完整認證流程

```
1️⃣ 用戶訪問前端頁面
   GET /dashboard
        ↓
2️⃣ PageGuardMiddleware 檢查認證
   從 Cookie 中讀取 auth_token
        ↓
3️⃣ Token 驗證
   ├─ 有效 → 設定 authenticatedUserId → 繼續
   └─ 無效 → 重定向到 /login
        ↓
4️⃣ 頁面渲染並返回 HTML
   ctx.render('Dashboard', { userId })
        ↓
5️⃣ 前端 JS 初始化（React 組件挂載）
   useEffect(() => {
     fetch('/api/dashboard', {
       headers: { 'Authorization': `Bearer ${token}` }
     })
   })
        ↓
6️⃣ JwtGuardMiddleware 驗證 API 請求
   檢查 Bearer Token
        ↓
7️⃣ API 響應數據
   返回 { success: true, data: {...} }
        ↓
8️⃣ 前端更新 UI
   setData(response.data)
```

---

## 🔐 Token 管理

### Token 存儲位置

```
┌─────────────────────────────┐
│   Storage Strategies        │
├─────────────────────────────┤
│ 1. HTTP-Only Cookie (推薦)   │
│    ├─ 優點: XSS 防護         │
│    ├─ 自動發送               │
│    └─ 無法被 JS 訪問         │
│                              │
│ 2. localStorage (次選)       │
│    ├─ 優點: 易於管理         │
│    ├─ 缺點: XSS 易被竊取     │
│    └─ 手動添加 Header        │
│                              │
│ 3. Memory (臨時)             │
│    ├─ 優點: 最安全           │
│    └─ 缺點: 頁面刷新丟失     │
└─────────────────────────────┘
```

### 推薦做法

```typescript
// 登入後設定 Cookie
// Cookie 會自動被 PageGuardMiddleware 讀取

// API 調用時附帶 Token
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

---

## 📋 實現清單：為新頁面添加認證保護

### Step 1: 在路由中添加 Middleware

```typescript
// app/Modules/YourModule/Presentation/Routes/pages.ts

export function registerPageRoutes(
  router: IModuleRouter,
  pageGuardMiddleware?: any
): void {
  // 受保護頁面
  const protectedMiddlewares = pageGuardMiddleware ? [pageGuardMiddleware] : []

  router.get('/your-page', protectedMiddlewares, async (ctx) => {
    const userId = ctx.get('authenticatedUserId')
    if (!userId) {
      return ctx.redirect('/login')
    }
    return ctx.render('YourModule/YourPage', { userId })
  })
}
```

### Step 2: 在 ServiceProvider 中配置 Middleware

```typescript
// app/Modules/YourModule/Infrastructure/Providers/YourModuleServiceProvider.ts

export class YourModuleServiceProvider extends ModuleServiceProvider {
  registerMiddleware(container: IContainer): void {
    const tokenValidator = container.make('tokenValidator')
    const pageGuardMiddleware = createPageGuardMiddleware(tokenValidator)

    container.singleton('pageGuardMiddleware', () => pageGuardMiddleware)
  }
}
```

### Step 3: 在前端頁面中調用 API

```typescript
// resources/js/Pages/YourModule/YourPage.tsx

import { useEffect, useState } from 'react'

export default function YourPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    // 調用受保護的 API
    fetch('/api/your-endpoint', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => setData(data))
    .catch(err => {
      if (err.status === 401) {
        // Token 無效，重定向到登入
        window.location.href = '/login'
      }
    })
  }, [])

  return (
    <div>
      {/* 頁面內容 */}
    </div>
  )
}
```

### Step 4: 為 API 路由添加 JWT 保護

```typescript
// app/Modules/YourModule/Presentation/Routes/api.ts

export function registerApiRoutes(
  router: IModuleRouter,
  jwtGuardMiddleware?: any
): void {
  const protectedMiddlewares = jwtGuardMiddleware ? [jwtGuardMiddleware] : []

  router.get('/api/your-endpoint', protectedMiddlewares, async (ctx) => {
    const userId = ctx.get('authenticatedUserId')
    // 業務邏輯
    return ctx.json({ success: true, data: {} })
  })
}
```

---

## 🐛 常見問題排查

### Q1: 頁面訪問時重定向到登入？

**原因**: Token 無效或過期

**解決方案**:
```typescript
// 檢查 Cookie 中是否有有效的 Token
1. 打開瀏覽器開發工具
2. Application → Cookies
3. 查找 auth_token
4. 如果不存在或過期，重新登入
```

### Q2: API 請求返回 401？

**原因**: 前端未發送 Authorization Header

**解決方案**:
```typescript
// 確保在 fetch 請求中添加 Token
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}` // ← 確保這一行存在
  }
})
```

### Q3: Middleware 未被應用？

**原因**: 路由配置時未傳入 middleware

**解決方案**:
```typescript
// ❌ 錯誤做法
router.get('/dashboard', [], async (ctx) => { ... })

// ✅ 正確做法
const middlewares = pageGuardMiddleware ? [pageGuardMiddleware] : []
router.get('/dashboard', middlewares, async (ctx) => { ... })
```

---

## 🎯 最佳實踐

### ✅ 做這些

```typescript
// 1. 在 middleware 中設定 authenticatedUserId
ctx.set('authenticatedUserId', userId)

// 2. 在頁面中檢查認證狀態
const userId = ctx.get('authenticatedUserId')

// 3. 使用 HTTP-Only Cookie 存儲 Token
response.setCookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict'
})

// 4. 在 API 調用中使用 Bearer Token
headers: { 'Authorization': `Bearer ${token}` }

// 5. 優雅地處理認證失敗
if (!userId) {
  return ctx.redirect('/login')
}
```

### ❌ 避免這些

```typescript
// 1. 不要在 JavaScript 中存儲 Token
❌ localStorage.setItem('token', token)  // XSS 風險

// 2. 不要在未經認證時訪問受保護的資源
❌ router.get('/protected', [], handler)  // 沒有 middleware

// 3. 不要暴露敏感信息在錯誤消息中
❌ ctx.json({ error: 'Database error: ...' })

// 4. 不要忽視 CORS 設定
❌ 允許任意域訪問認證 API

// 5. 不要信任客戶端的認證信息
❌ if (ctx.query.userId) { ... }  // 可被偽造
```

---

## 📊 Middleware 使用統計

| 頁面 | 路由 | Middleware | 狀態 |
|------|------|-----------|------|
| Login | `/login` | 無 | ✅ 公開 |
| Register | `/register` | 無 | ✅ 公開 |
| Dashboard | `/dashboard` | PageGuard | ✅ 受保護 |
| User Pages | `/user/*` | PageGuard | ✅ 受保護 |
| Cart Pages | `/cart/*` | PageGuard | ✅ 受保護 |
| Order Pages | `/order/*` | PageGuard | ✅ 受保護 |
| Product Pages | `/product/*` | PageGuard | ✅ 受保護 |
| Payment Pages | `/payment/*` | PageGuard | ✅ 受保護 |
| Post Pages | `/post/*` | PageGuard | ✅ 受保護 |
| Health Pages | `/health/*` | PageGuard | ✅ 受保護 |

**API 路由**:

| 端點 | 方法 | Middleware | 狀態 |
|------|------|-----------|------|
| `/api/auth/login` | POST | 無 | ✅ 公開 |
| `/api/auth/register` | POST | 無 | ✅ 公開 |
| `/api/users/:id` | GET | JwtGuard | ✅ 受保護 |
| `/api/cart/*` | * | JwtGuard | ✅ 受保護 |
| `/api/orders/*` | * | JwtGuard | ✅ 受保護 |

---

## 🔗 相關文檔

- [../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md) - 架構分層原則
- [../04-Module-Development/MODULES_INVENTORY.md](../04-Module-Development/MODULES_INVENTORY.md) - 模組列表
- [../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md) - 自動裝配系統

---

**最後更新**: 2026-03-14

**下一步**:
- [ ] 為所有受保護頁面配置 Middleware
- [ ] 實現前端 Token 管理（自動更新、過期重定向）
- [ ] 添加 CSRF 防護
- [ ] 實現速率限制 (Rate Limiting)
