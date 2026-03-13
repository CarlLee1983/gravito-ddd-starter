# 🔍 完整模組路由設定檢測報告

**檢測日期**: 2026-03-13
**檢測時間**: 完整掃描與分析
**檢測狀態**: ⚠️ 發現 6 個關鍵問題

---

## 📊 檢測總覽

| 指標 | 結果 |
|------|------|
| **總模組數** | 10 |
| **定義路由的模組** | 9 ✅ |
| **沒有路由的模組** | 1 ❌ |
| **路由正常工作** | 8 ✅ |
| **路由裝配失敗** | 1 ❌ |
| **路由註冊被跳過** | 1 ⚠️ |
| **架構違規** | 3 ⚠️ |

---

## 📋 模組路由狀態詳解

### ✅ **1. User 模組**

**狀態**: ✅ 正常運作

- **入口文件**: `app/Modules/User/index.ts`
- **註冊方式**: `wireUserRoutes`
- **位置**: `app/Modules/User/Infrastructure/Wiring/wireUserRoutes.ts`
- **路由文件**: `app/Modules/User/Presentation/Routes/api`
- **已註冊路由**:
  - `GET /api/users` - 列出所有用戶
  - `GET /api/users/:id` - 獲取單個用戶
  - `POST /api/users` - 創建用戶
- **啟動日誌**: ✅ 成功
  ```
  [Router] Registering GET /api/users
  [Router] Registering GET /api/users/:id
  [Router] Registering POST /api/users
  [AutoWirer] ✅ Routes wired successfully for module: User
  ```

---

### ✅ **2. Post 模組**

**狀態**: ✅ 正常運作

- **入口文件**: `app/Modules/Post/index.ts`
- **註冊方式**: `wirePostRoutes`
- **位置**: `app/Modules/Post/Infrastructure/Wiring/wirePostRoutes.ts`
- **路由文件**: `app/Modules/Post/Presentation/Routes/Post.routes`
- **已註冊路由**:
  - `GET /api/Post` - 列出所有文章
  - `GET /api/Post/:id` - 獲取單個文章
  - `POST /api/Post` - 創建文章
- **啟動日誌**: ✅ 成功
- **架構問題**: ⚠️ 路由命名不一致（`/api/Post` 應為 `/api/posts`）

---

### ✅ **3. Cart 模組**

**狀態**: ✅ 正常運作

- **入口文件**: `app/Modules/Cart/index.ts`
- **註冊方式**: `wireCartRoutes`
- **位置**: `app/Modules/Cart/Infrastructure/Wiring/wireCartRoutes.ts`
- **路由文件**: `app/Modules/Cart/Presentation/Routes/api`
- **已註冊路由**:
  - `GET /carts/:userId` - 獲取購物車
  - `POST /carts/:userId/items` - 新增項目
  - `DELETE /carts/:userId/items/:productId` - 移除項目
  - `PATCH /carts/:userId/items/:productId` - 更新項目數量
  - `DELETE /carts/:userId` - 清空購物車
  - `POST /carts/:userId/checkout` - 結帳
- **啟動日誌**: ✅ 成功

---

### ✅ **4. Product 模組**

**狀態**: ❌ 路由裝配失敗

- **入口文件**: `app/Modules/Product/index.ts`
- **註冊方式**: `wireProductRoutes`
- **位置**: `app/Modules/Product/Infrastructure/Wiring/wireProductRoutes.ts`
- **路由文件**: `app/Modules/Product/Presentation/Routes/api`
- **預期路由**:
  - `GET /api/products` - 列出所有產品
  - `GET /api/products/:id` - 獲取單個產品
  - `POST /api/products` - 創建產品
- **啟動日誌**: ❌ 失敗
  ```
  [wireProductRoutes] Starting route registration...
  [wireProductRoutes] Resolving productRepository...
  [wireProductRoutes] ✓ productRepository resolved
  [wireProductRoutes] Resolving logger...
  ❌ [AutoWirer] 裝配模組 app/Modules/Product/index.ts 路由時發生錯誤:
  error: Service 'logger' not found in container
  ```
- **根本原因**: wireProductRoutes.ts 第 33 行嘗試從容器取得 'logger' 服務，但該服務在路由裝配階段不可用

**修復建議**:
```typescript
// wireProductRoutes.ts - 第 32-34 行
let logger: ILogger
try {
  logger = ctx.container.make('logger') as ILogger
} catch {
  logger = { debug: () => {}, info: () => {} } as any // fallback
}
```

---

### ⚠️ **5. Auth 模組**

**狀態**: ⚠️ 路由註冊被跳過

- **入口文件**: `app/Modules/Auth/index.ts`
- **註冊方式**: `wireAuthRoutes`
- **位置**: `app/Modules/Auth/Infrastructure/Wiring/wireAuthRoutes.ts`
- **路由文件**: `app/Modules/Auth/Presentation/Routes/api` 和 `pages`
- **預期路由**:
  - `POST /api/auth/login` - 登入
  - `POST /api/auth/register` - 註冊
  - `POST /api/auth/logout` - 登出
  - `GET /api/auth/me` - 獲取當前用戶
  - SSR 頁面路由 (/, /login, /register, /dashboard)
- **啟動日誌**: ⚠️ 路由被跳過
  ```
  [wireAuthRoutes] Warning: authController not ready, skipping route registration
  [AutoWirer] ✅ Routes wired successfully for module: Auth
  ```
- **根本原因**: wireAuthRoutes.ts 無法從容器取得 authController，原因是 AuthServiceProvider 依賴的服務（如 `userProfileService` 或 `authMessages`）未被註冊

**修復建議**: 在 wireAuthRoutes.ts 中增加更詳細的錯誤日誌，識別具體缺失的依賴

---

### ✅ **6. Order 模組**

**狀態**: ✅ 正常運作

- **入口文件**: `app/Modules/Order/index.ts`
- **註冊方式**: `wireOrderRoutes`
- **位置**: `app/Modules/Order/Infrastructure/Wiring/wireOrderRoutes.ts`
- **路由文件**: `app/Modules/Order/Presentation/Routes/Order.routes`
- **已註冊路由**:
  - `POST /orders` - 創建訂單
  - `GET /orders/:id` - 獲取訂單
  - `GET /users/:userId/orders` - 獲取用戶訂單列表
  - `POST /orders/:id/confirm` - 確認訂單
  - `POST /orders/:id/ship` - 發貨
  - `POST /orders/:id/cancel` - 取消訂單
- **啟動日誌**: ✅ 成功

---

### ✅ **7. Payment 模組**

**狀態**: ✅ 正常運作

- **入口文件**: `app/Modules/Payment/index.ts`
- **註冊方式**: `wirePaymentRoutes`
- **位置**: `app/Modules/Payment/Infrastructure/Wiring/wirePaymentRoutes.ts`
- **路由文件**: `app/Modules/Payment/Presentation/Routes/payment.routes`
- **已註冊路由**:
  - `GET /api/payments/:id` - 獲取支付詳情
  - `GET /api/payments/order/:orderId` - 獲取訂單支付
  - `GET /api/payments` - 列出所有支付
- **啟動日誌**: ✅ 成功

---

### ✅ **8. Health 模組**

**狀態**: ✅ 正常運作

- **入口文件**: `app/Modules/Health/index.ts`
- **註冊方式**: `wireHealthRoutes`
- **位置**: `app/Modules/Health/Infrastructure/Wiring/wireHealthRoutes.ts`
- **路由文件**: `app/Modules/Health/Presentation/Routes/health.routes`
- **已註冊路由**:
  - `GET /health` - 健康檢查
  - `GET /health/history` - 健康檢查歷史
- **啟動日誌**: ✅ 成功
- **架構設計**: ⭐ 良好範例（動態 RuntimeInfrastructureProbeAdapter，支持運行時服務探測）

---

### ✅ **9. Portal 模組**

**狀態**: ✅ 部分正常運作

- **入口文件**: `app/Modules/Portal/index.ts`
- **註冊方式**: `wirePortalRoutes`
- **位置**: `app/Modules/Portal/Infrastructure/Wiring/wirePortalRoutes.ts`
- **路由文件**: `app/Modules/Portal/Presentation/Routes/api` 和 `pages`
- **已註冊路由**:
  - `GET /test-module-router` - 模組路由測試端點
  - `GET /api/portal/data` - Portal 數據聚合
  - `GET /` - 首頁
- **啟動日誌**: ✅ 成功
- **架構問題**: ⚠️
  1. 測試路由 `/test-module-router` 應移除或條件化
  2. registerPageRoutes 沒有返回預期的路由（只有 `/`）
  3. 與 Product 服務的依賴耦合度較高（防腐層設計）

---

### ❌ **10. Session 模組**

**狀態**: ❌ 根本沒有路由定義

- **入口文件**: `app/Modules/Session/index.ts`
- **模組定義**:
  ```typescript
  export const SessionModule: IModuleDefinition = {
    name: 'Session',
    provider: SessionServiceProvider,
    // ❌ 缺少 registerRoutes
  }
  ```
- **模組結構**: 只有 Domain/Application/Infrastructure，**沒有 Presentation 層**
- **應用層狀況**:
  - 有 ValidateSessionService（應用服務）
  - 有 MemorySessionRepository（內部實現）
  - 沒有 Controller 或路由
- **啟動日誌**: 路由相關的日誌完全缺失

**架構違規**:
- ❌ Session 模組不遵循 DDD 標準分層（缺少 Presentation 層）
- ❌ 沒有 HTTP 端點公開 Session 操作
- ❌ 無法外部調用 Session 服務

**設計問題**: Session 被視為內部服務（被 Auth 模組使用），但架構應該明確化其意圖
- 如果是**內部只用服務**：應文檔化說明，無需 HTTP 層
- 如果是**公開服務**：需要添加 Presentation 層和路由

---

## 🎯 關鍵問題總結

### 問題 1️⃣: Product 路由裝配失敗 (CRITICAL)
- **位置**: `app/Modules/Product/Infrastructure/Wiring/wireProductRoutes.ts:33`
- **問題**: 依賴的 'logger' 服務在路由装配階段不可用
- **影響**: Product 模組完全無法使用
- **優先級**: 🔴 CRITICAL

### 問題 2️⃣: Auth 路由未註冊 (CRITICAL)
- **位置**: `app/Modules/Auth/Infrastructure/Wiring/wireAuthRoutes.ts:26-29`
- **問題**: authController 無法從容器取得（缺少依賴）
- **影響**: 所有認證端點都無法使用
- **優先級**: 🔴 CRITICAL

### 問題 3️⃣: Session 模組沒有路由 (HIGH)
- **位置**: `app/Modules/Session/index.ts`
- **問題**: 沒有定義 registerRoutes，沒有 Presentation 層
- **影響**: Session 操作無法通過 HTTP 調用
- **優先級**: 🟠 HIGH

### 問題 4️⃣: Post 路由命名不一致 (MEDIUM)
- **位置**: `app/Modules/Post/Presentation/Routes/Post.routes.ts`
- **問題**: 路由使用 `/api/Post` 而不是 `/api/posts`（駝峰命名不符合 RESTful）
- **影響**: API 命名不一致，降低可維護性
- **優先級**: 🟡 MEDIUM

### 問題 5️⃣: Portal 路由未完全実現 (MEDIUM)
- **位置**: `app/Modules/Portal/Infrastructure/Wiring/wirePortalRoutes.ts`
- **問題**:
  1. 有測試路由 `/test-module-router`（應移除）
  2. `registerPageRoutes` 只註冊了 `/`，應該有更多頁面路由
- **影響**: Portal 前端路由功能不完整
- **優先級**: 🟡 MEDIUM

### 問題 6️⃣: 架構一致性問題 (MEDIUM)
- **位置**: 全局
- **問題**: 不同模組使用不同的路由註冊模式
  - 有 wire*Routes.ts 模式（User, Post, Health）
  - 有 registerRoles 函數模式（Cart）
  - 有混合模式（Auth, Portal）
- **影響**: 新開發者難以理解和遵循
- **優先級**: 🟡 MEDIUM

---

## ✅ 良好實踐示例

### ⭐ Health 模組（推薦架構範本）

**亮點**:
1. ✅ 清晰的 wireHealthRoutes 實現
2. ✅ RuntimeInfrastructureProbeAdapter 支持動態服務探測
3. ✅ 內聯路由定義（不依賴外部路由函數）
4. ✅ 優雅的錯誤處理和降級方案

**實現模式**:
```typescript
export function wireHealthRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 直接組裝所有依賴
  const repository = new MemoryHealthCheckRepository()
  const databaseCheck = createGravitoDatabaseConnectivityCheck()

  // 動態探測（請求時執行）
  router.get('/health', (hctx) => {
    const probe = new RuntimeInfrastructureProbeAdapter(databaseCheck, ctx.container)
    const service = new PerformHealthCheckService(repository, probe)
    const controller = new HealthController(service, messages)
    return controller.check(hctx)
  })
}
```

### ⭐ Cart 模組（優雅降級）

**亮點**:
1. ✅ try-catch 包裝容器調用
2. ✅ 清晰的警告日誌
3. ✅ 無依賴時優雅跳過路由註冊

**實現模式**:
```typescript
export function wireCartRoutes(ctx: IRouteRegistrationContext): void {
  try {
    const services = {
      add: ctx.container.make('addItemToCartService'),
      remove: ctx.container.make('removeItemFromCartService'),
      checkout: ctx.container.make('checkoutCartService'),
      repo: ctx.container.make('cartRepository')
    }
    const controller = new CartController(...services)
    registerCartRoutes(router, controller)
  } catch (error) {
    console.warn('[wireCartRoutes] Warning: services not ready, skipping routes')
    return
  }
}
```

---

## 🛠️ 修復方案

### 步驟 1: 修復 Product 模組（立即）
**文件**: `app/Modules/Product/Infrastructure/Wiring/wireProductRoutes.ts`
```typescript
// 加入 logger 的降級處理
let logger: ILogger
try {
  logger = ctx.container.make('logger') as ILogger
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  } as any
}
```

### 步驟 2: 修復 Auth 模組（立即）
**文件**: `app/Modules/Auth/Infrastructure/Wiring/wireAuthRoutes.ts`
```typescript
// 增強錯誤日誌，識別具體缺失的依賴
try {
  authController = ctx.container.make('authController') as AuthController
} catch (error) {
  console.error('[wireAuthRoutes] Failed to wire auth routes:', {
    error: (error as Error).message,
    availableServices: Object.keys(ctx.container.bindings || {})
  })
  return
}
```

### 步驟 3: 修復 Session 模組（短期）
**決策**: Session 應該是內部服務還是公開服務？
- **選項 A**: 保持為內部服務 → 在 index.ts 中添加文檔，說明它只被 Auth 模組使用
- **選項 B**: 轉為公開服務 → 添加 Presentation 層和路由（GetSessionService, RevokeSessionService）

**推薦**: 選項 A（內部服務），因為 Session 的生命週期由 Auth 模組管理

### 步驟 4: 統一路由架構模式（中期）
**建議**: 統一所有模組使用 wire*Routes.ts 模式

**標準模板**:
```typescript
// Infrastructure/Wiring/wire{Module}Routes.ts
export function wire{Module}Routes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 1. 安全地從容器取得所有依賴
  let services: any
  try {
    services = {
      service1: ctx.container.make('service1'),
      service2: ctx.container.make('service2'),
    }
  } catch (error) {
    console.warn(`[wire{Module}Routes] Services not ready, skipping routes`)
    return
  }

  // 2. 創建控制器
  const controller = new {Module}Controller(...Object.values(services))

  // 3. 註冊路由
  register{Module}Routes(router, controller)
}
```

### 步驟 5: 規範路由命名（長期）
- Post: `/api/Post` → `/api/posts`
- Cart: `/carts/:userId` → `/api/carts/:userId`（統一 /api 前綴）
- 確保所有 RESTful 端點使用小寫複數命名

---

## 📋 驗證清單

使用此清單驗證每個模組的路由設定：

- [ ] **模組定義**: index.ts 中有 IModuleDefinition 導出
- [ ] **registerRoutes**: 定義了路由註冊函數
- [ ] **wire*Routes.ts**: 存在並實現了依賴解析邏輯
- [ ] **Controller**: Presentation/Controllers 中有相應的 Controller
- [ ] **路由函數**: Presentation/Routes 中有 register*Routes 函數
- [ ] **容器綁定**: ServiceProvider 註冊了必要的依賴
- [ ] **錯誤處理**: 路由裝配失敗時有 try-catch 和日誌
- [ ] **啟動驗證**: 應用啟動時在日誌中看到 ✅ 路由成功裝配
- [ ] **實際測試**: 用 curl/Postman 測試端點是否可用

---

## 🎬 後續行動

1. **立即修復** (今天)
   - [ ] 修復 Product 模組路由裝配失敗
   - [ ] 修復 Auth 模組路由未註冊
   - [ ] 測試兩個模組的端點

2. **短期修復** (本週)
   - [ ] 決定 Session 模組的公開/內部角色
   - [ ] 移除 Portal 模組的測試路由
   - [ ] 更新 Portal registerPageRoutes

3. **中期優化** (本月)
   - [ ] 統一所有模組使用 wire*Routes.ts 模式
   - [ ] 規範路由命名（/api/posts 而不是 /api/Post）
   - [ ] 建立路由架構文檔和最佳實踐指南

4. **長期改進** (季度)
   - [ ] 建立路由自動化測試
   - [ ] 實施路由冗餘檢查（發現未使用的路由）
   - [ ] 建立模組開發清單（確保新模組完整實現路由層）

---

**報告生成**: 2026-03-13
**檢測工具**: gravito-ddd 自動化檢測系統
**版本**: v1.0
