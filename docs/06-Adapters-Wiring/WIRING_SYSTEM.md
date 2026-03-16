# Wiring & Auto-Assembly Guide (接線與自動裝配)

> **核心願景**：實現「零手動接線」的模組化架構。新增功能只需符合目錄結構與契約，系統啟動時將自動掃描並完成所有層級的裝配。

---

## 🏗️ 自動裝配架構 (Auto-Wiring)

專案使用 `ModuleAutoWirer` 掃描 `app/Modules/*/index.ts`。裝配流程分為三個關鍵步驟：

1.  **Infrastructure 裝配**：註冊模組的 Repository 工廠。
2.  **DI 裝配**：執行模組的 `ServiceProvider.register()`，將服務掛載到全局容器。
3.  **Presentation 裝配**：執行 `registerRoutes` 將模組路由掛載到 Web 框架。

### 核心組件

-   **`IModuleDefinition`**: 位於 `app/Foundation/Infrastructure/Wiring/ModuleDefinition.ts`. 每個模組必須導出的裝配契約。
-   **`ModuleAutoWirer`**: 位於 `start/wiring/ModuleAutoWirer.ts`. 負責掃描、動態導入與執行。
-   **`bootstrap.ts`**: 啟動自動掃描的起點。

---

## 📋 模組裝配定義 (IModuleDefinition)

每個模組的入口點 (`app/Modules/{Name}/index.ts`) 必須導出一個符合此介面的物件。

### 實作範例

```typescript
// app/Modules/User/index.ts
import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'
import { registerUserRepositories } from './Infrastructure/Providers/registerUserRepositories'

export const UserModule: IModuleDefinition = {
  name: 'User',                              // 模組名稱 (用於日誌)
  provider: UserServiceProvider,            // DI 服務提供者類別
  registerRepositories: registerUserRepositories, // (選填) 註冊 Repository 工廠到 Registry
  registerRoutes: (ctx) => {                 // (選填) 註冊路由
    const controller = ctx.container.make('userController')
    const router = ctx.createModuleRouter()
    
    router.get('/users', (c) => controller.index(c))
  }
}
```

---

## 🛠️ 啟動流程 (Bootstrap)

在 `app/bootstrap.ts` 中，只需執行以下邏輯即可啟動全系統裝配：

```typescript
// Step 1: 建立 DatabaseAccess
const db = dbBuilder.getDatabaseAccess()

// Step 2: 自動裝配所有模組
await ModuleAutoWirer.wire(core, db)
```

---

## 🚀 新增模組的標準流程

1.  **建立目錄**: 在 `app/Modules/` 下建立新資料夾。
2.  **實作邏輯**: 編寫 Domain, Application, Infrastructure 層。
3.  **定義入口**: 在 `index.ts` 導出符合 `IModuleDefinition` 的物件（後綴必須為 `Module`，如 `PaymentModule`）。
4.  **自動識別**: 重啟後系統會顯示 `[AutoWire] Payment module integrated.`。

### 診斷
若模組未啟動：
- 檢查檔案名稱是否為 `index.ts`。
- 檢查導出的物件是否包含 `provider`。
- 檢查是否使用了 `export const XxxModule = ...`。

最後更新: 2026-03-13
