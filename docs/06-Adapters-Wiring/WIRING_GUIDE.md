# Wiring & Auto-Assembly Guide (接線與自動裝配指南)

> **核心願景**：實現「零手動接線」的模組化架構。新增功能只需符合目錄結構，系統啟動時將自動掃描並完成所有層級的裝配。

---

## 🏗️ 自動裝配架構 (Auto-Wiring)

專案使用 `ModuleAutoWirer` 掃描 `src/Modules/*/index.ts`。裝配流程分為三個關鍵步驟：

1.  **Infrastructure 裝配**：註冊模組的 Repository 工廠。
2.  **DI 裝配**：將模組的 `ServiceProvider` 註冊到全局依賴注入容器。
3.  **Presentation 裝配**：實例化控制器並將其路由掛載到 Web 框架。

### 核心組件

-   **`IModuleDefinition`**：每個模組必須導出的裝配契約。
-   **`ModuleAutoWirer`**：負責掃描、導入與執行裝配。
-   **`bootstrap.ts`**：啟動自動掃描的起點。

---

## 📋 模組裝配定義 (IModuleDefinition)

每個模組的入口點 (`src/Modules/{Name}/index.ts`) 必須導出一個符合介面的物件。

### 實作範例

```typescript
// src/Modules/User/index.ts
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'
import { registerUserRepositories } from './Infrastructure/Providers/registerUserRepositories'
import { registerUser } from '@wiring/index'

export const UserModule: IModuleDefinition = {
  name: 'User',                              // 模組名稱
  provider: UserServiceProvider,            // DI 服務提供者
  registerRepositories: registerUserRepositories, // (選填) 註冊 Repository 工廠
  registerRoutes: registerUser               // (選填) 註冊路由與裝配控制器
}
```

---

## 🛠️ 啟動流程 (Bootstrap)

在 `src/bootstrap.ts` 中，只需一行代碼即可啟動全系統裝配：

```typescript
// bootstrap.ts
const db = dbBuilder.getDatabaseAccess()
const core = new PlanetCore(config)

// ✨ 一鍵裝配所有模組
await ModuleAutoWirer.wire(core, db)
```

---

## 🚀 新增模組的流程

1.  **建立模組目錄**：遵循 `Domain`, `Application`, `Infrastructure`, `Presentation` 的分層結構。
2.  **定義入口點**：在 `index.ts` 中導出 `IModuleDefinition` 物件。
3.  **重啟系統**：模組將被自動識別並裝配，無需修改 `bootstrap.ts` 或 `src/routes.ts`。

### 檢查清單 (Wiring Checklist)
- [ ] `index.ts` 是否有命名為 `{Name}Module` 的導出物件？
- [ ] 該物件是否包含 `provider`？
- [ ] 若有資料庫，是否包含 `registerRepositories`？
- [ ] 路由裝配函式是否已正確導出並引用？

---

## 🔬 裝配診斷

當系統啟動時，控制台會顯示 `Module Auto-Wiring Report`：
- **Staged Modules**: 已掃描到的模組數量。
- **Active List**: 成功啟動並註冊的模組名稱清單。

若模組未出現，請檢查 `index.ts` 是否符合 `IModuleDefinition` 介面規範。
