# 🔄 Token 自動刷新實施指南

**狀態**: ✅ 完成 | **日期**: 2026-03-14 | **版本**: 1.0

## 📋 概述

實施完整的 Token 自動刷新機制，確保用戶會話不會因 Token 過期而中斷。

### 核心特性

- ✅ 定期檢查 Token 過期狀態
- ✅ 自動刷新即將過期的 Token
- ✅ 刷新失敗時優雅降級（重定向到登入）
- ✅ 防止並發刷新請求
- ✅ 3 個 Token 相關 Hook 供組件使用

---

## 🔧 後端實施

### POST /api/auth/refresh

新增路由，允許使用有效 Token 獲得新 Token。

**路由配置** (`app/Modules/Auth/Presentation/Routes/api.ts`):
```typescript
// 刷新 Token 路由（需 JWT Guard）
const refreshMiddlewares = jwtGuardMiddleware ? [jwtGuardMiddleware] : []
router.post('/api/auth/refresh', refreshMiddlewares, (ctx) => authController.refresh(ctx))
```

**控制器方法** (`AuthController.refresh()`):
- 驗證現有 Token 有效性
- 生成新 Token（相同過期時間或更新時間）
- 返回 `{ success: true, data: { accessToken, expiresAt, expiresIn } }`

**錯誤響應**:
- `401 Unauthorized`: Token 缺失或無效
- `500 Internal Server Error`: 刷新過程失敗

---

## 🎨 前端實施

### 1️⃣ Token 刷新 Hook

**檔案**: `resources/js/hooks/useTokenRefresh.ts`

```typescript
import { useTokenRefresh } from '@/hooks/useTokenRefresh'

// 在 AuthProvider 或其他組件中使用
useTokenRefresh({
  enabled: true,              // 是否啟用自動刷新
  checkInterval: 60000,       // 檢查間隔（毫秒）
  expiryThreshold: 5,         // 過期預警（分鐘）
  onRefreshSuccess: (token) => {
    // Token 刷新成功時的回調
  },
  onRefreshFailed: () => {
    // Token 刷新失敗時的回調
  }
})
```

### 2️⃣ AuthContext 集成

在 AuthProvider 中啟用自動刷新：

```typescript
export function AuthProvider({ children }) {
  // ...

  // 自動刷新 Token
  useTokenRefresh({
    enabled: true,
    checkInterval: 60000,      // 每分鐘檢查
    expiryThreshold: 5,        // Token 在 5 分鐘內過期時刷新
    onRefreshSuccess: (newToken) => {
      console.log('Token 自動刷新成功')
    },
    onRefreshFailed: () => {
      // 刷新失敗時清除用戶狀態
      setUser(null)
    },
  })

  // ... rest of provider
}
```

### 3️⃣ 其他 Token 相關 Hook

#### useTokenExpiryTime()

獲取 Token 剩餘時間（秒）：

```typescript
import { useTokenExpiryTime } from '@/hooks/useTokenRefresh'

export function SessionTimeout() {
  const remainingTime = useTokenExpiryTime()

  if (remainingTime && remainingTime < 300) {
    return <div>Token 即將在 {remainingTime} 秒後過期</div>
  }

  return null
}
```

#### useIsTokenValid()

檢查 Token 是否有效：

```typescript
import { useIsTokenValid } from '@/hooks/useTokenRefresh'

export function ProtectedComponent() {
  const isValid = useIsTokenValid()

  if (!isValid) {
    return <Redirect to="/login" />
  }

  return <div>受保護的內容</div>
}
```

---

## 📊 工作流程

```
AuthProvider 初始化
      ↓
useTokenRefresh Hook 掛載
      ├─ 立即執行一次檢查
      └─ 每 60 秒檢查一次 Token 狀態
      ↓
定期檢查
  ├─ Token 有效 & 距離過期 > 5 分鐘？
  │  └─ 繼續執行，無需刷新
  │
  └─ Token 有效 & 距離過期 ≤ 5 分鐘？
     └─ 發起 POST /api/auth/refresh 請求
        ├─ 成功：保存新 Token 到 localStorage
        ├─ 失敗：清除 Token，重定向到 /login
        └─ 防止並發：同時只允許一個刷新請求
```

---

## 🛡️ 安全特性

### 並發刷新防護

使用 `isRefreshingRef` 防止同時發起多個刷新請求：

```typescript
if (isRefreshingRef.current) return // 正在刷新中，跳過

isRefreshingRef.current = true
try {
  // 執行刷新
} finally {
  isRefreshingRef.current = false
}
```

### 自動降級

刷新失敗時的處理：

```typescript
catch (error) {
  clearToken()

  if (onRefreshFailed) {
    onRefreshFailed()
  } else {
    // 預設：重定向到登入頁
    window.location.href = '/login?reason=token_expired'
  }
}
```

### Token 驗證

使用 JWT 解碼驗證 Token 有效性（不驗證簽名）：

```typescript
const decoded = decodeToken(token)
const isExpired = decoded.exp * 1000 < Date.now()
```

---

## 🔧 配置選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `enabled` | boolean | true | 是否啟用自動刷新 |
| `checkInterval` | number | 60000 | 檢查間隔（毫秒） |
| `expiryThreshold` | number | 5 | 過期預警時間（分鐘） |
| `onRefreshSuccess` | function | - | 刷新成功回調 |
| `onRefreshFailed` | function | - | 刷新失敗回調 |

### 推薦配置

```typescript
// 適合長期會話（超過 8 小時）
useTokenRefresh({
  checkInterval: 300000,      // 每 5 分鐘檢查
  expiryThreshold: 15,        // 15 分鐘內過期時刷新
})

// 適合一般應用（2-7 天 Token）
useTokenRefresh({
  checkInterval: 60000,       // 每 1 分鐘檢查
  expiryThreshold: 5,         // 5 分鐘內過期時刷新
})

// 適合短期會話（< 1 小時）
useTokenRefresh({
  checkInterval: 30000,       // 每 30 秒檢查
  expiryThreshold: 3,         // 3 分鐘內過期時刷新
})
```

---

## 📝 API 響應格式

### 刷新成功 (200 OK)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-03-21T12:34:56Z",
    "expiresIn": 604800,
    "tokenType": "Bearer",
    "userId": "user-123"
  }
}
```

### 刷新失敗 (401 Unauthorized)

```json
{
  "success": false,
  "message": "Token 遺失"
}
```

### 刷新失敗 (500 Server Error)

```json
{
  "success": false,
  "message": "Token 刷新失敗"
}
```

---

## 🐛 常見問題

### Q1: 為什麼 Token 刷新後仍然收到 401 錯誤？

**A**: 可能的原因：
1. 新 Token 未正確保存到 localStorage
2. 刷新請求本身遭到 401（舊 Token 已過期）
3. 後端的 `/api/auth/refresh` 端點未正確實現

**解決方案**:
```typescript
// 檢查 Token 是否正確保存
const token = getToken()
console.log('當前 Token:', token)

// 檢查 localStorage
console.log('localStorage Token:', localStorage.getItem('auth_token'))
```

### Q2: 如何禁用自動刷新？

```typescript
useTokenRefresh({
  enabled: false
})

// 或使用環境變數
useTokenRefresh({
  enabled: process.env.NODE_ENV === 'production'
})
```

### Q3: 刷新失敗時如何自定義行為？

```typescript
useTokenRefresh({
  onRefreshFailed: () => {
    // 自定義處理
    showNotification('會話已過期，請重新登入')
    // 不要手動重定向，Hook 會自動處理
  }
})
```

### Q4: Token 刷新時用戶會被登出嗎？

**A**: 不會。自動刷新是透明的：
- 用戶不會看到任何中斷
- 新 Token 自動保存
- 現有請求繼續執行
- 只有在刷新**失敗**時才會登出

---

## 🔍 調試技巧

### 啟用詳細日誌

```typescript
// 在 AuthContext 中
useTokenRefresh({
  checkInterval: 10000,  // 每 10 秒檢查（便於測試）
  expiryThreshold: 0.5,  // 30 秒內過期時刷新
  onRefreshSuccess: (token) => {
    console.log('[DEBUG] Token 刷新成功:', token.slice(0, 20) + '...')
  },
  onRefreshFailed: () => {
    console.log('[DEBUG] Token 刷新失敗')
  }
})
```

### 監控 Token 狀態

```typescript
// 在組件中
export function TokenDebugger() {
  const token = getToken()
  const remaining = useTokenExpiryTime()
  const isValid = useIsTokenValid()

  return (
    <div style={{ fontSize: '12px', padding: '10px', background: '#eee' }}>
      <div>Token: {token ? token.slice(0, 30) + '...' : 'None'}</div>
      <div>Valid: {isValid ? '✓' : '✗'}</div>
      <div>Remaining: {remaining ? remaining + 's' : '-'}</div>
      <div>Expiring Soon: {remaining && remaining < 300 ? '⚠️ Yes' : 'No'}</div>
    </div>
  )
}
```

---

## 📚 相關文檔

- [TOKEN_MANAGEMENT.md](./TOKEN_MANAGEMENT.md) - Phase 1: 基本 Token 管理
- [MIDDLEWARE_GUIDE.md](./MIDDLEWARE_GUIDE.md) - 後端 Middleware 配置
- [../../types/frontend/contexts.d.ts](../../types/frontend/contexts.d.ts) - 類型定義

---

## 📋 實施檢查清單

- [x] 後端 `/api/auth/refresh` 端點實現
- [x] AuthController.refresh() 方法
- [x] 前端 useTokenRefresh Hook
- [x] useTokenExpiryTime Hook
- [x] useIsTokenValid Hook
- [x] AuthContext 集成刷新邏輯
- [x] IAuthMessages 擴展（refresh、registration 訊息）
- [x] 翻譯文件更新（英文、繁中）
- [x] 並發刷新防護
- [x] 錯誤處理和降級方案
- [x] 文檔完成

---

**最後更新**: 2026-03-14

**下一步** (Phase 3):
- [ ] 實現 CSRF Token 保護
- [ ] 添加請求重試邏輯（指數退避）
- [ ] 實現請求去重（防止表單重複提交）
- [ ] Session 超時警告提示（倒數計時器）
