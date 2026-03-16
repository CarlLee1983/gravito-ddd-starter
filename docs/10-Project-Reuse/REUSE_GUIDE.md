# 專案再利用指南（Deep Reuse Guide）

本文件說明如何以 gravito-ddd 作為 **每個新專案各自一個 repo** 的 DDD starter，並提供完整架構理解與落地步驟。

---

## ✅ 適用情境

- 你要建立新的 API / 服務專案，但想保留 DDD 四層架構與模組化設計。
- 你希望 **快速啟動**，並在未來需要時再逐步引入事件系統、ORM、I18N 等能力。
- 你要用此 repo 做為 template，複製出多個產品或服務。

---

## 🧭 架構分析（深度版）

### 1) 四層架構與依賴方向

- **Presentation**: HTTP 路由、控制器、輸入驗證、回應格式化
- **Application**: Use Cases、協調流程、DTO 映射、交易
- **Domain**: 聚合根、值物件、領域事件、核心規則（**不得依賴外部框架**）
- **Infrastructure**: Repository 實作、ORM、外部服務、快取

**依賴方向**：Presentation → Application → Domain ← Infrastructure（倒依賴）

對應位置：
- `app/Modules/<Module>/Presentation`
- `app/Modules/<Module>/Application`
- `app/Modules/<Module>/Domain`
- `app/Modules/<Module>/Infrastructure`

---

### 2) 模組自動裝配（Auto-Wiring）

核心理念：新增模組只要符合目錄結構與契約，啟動時自動裝配。

關鍵元件：
- `IModuleDefinition`（`app/Foundation/Infrastructure/Wiring/ModuleDefinition.ts`）
- `ModuleAutoWirer`（`start/wiring/ModuleAutoWirer.ts`）
- `bootstrap`（`app/bootstrap.ts`）

每個模組需在 `app/Modules/<Name>/index.ts` 匯出：
- `name`
- `provider`
- `registerRepositories`（可選）
- `registerRoutes`（可選）

只要檔名為 `index.ts` 且匯出 `XxxModule`，系統會自動識別。

---

### 3) 事件系統（Event System）

系統支援 **Domain Events** 與 **Integration Events**，並具備：
- 自動重試
- 死信隊列（DLQ）
- 多分發策略（Memory / Redis / RabbitMQ）

這讓跨模組協作可以保持鬆耦合，且不破壞 DDD 邊界。

---

### 4) ORM 透明設計

本專案允許 **ORM 與 Database 解耦**：
- 開發預設使用 `memory`
- 生產可切換 `drizzle` 或 `atlas`

切換只需調整環境變數，不改任何 Repository / Service 代碼。

---

### 5) I18N 與 Message Service Pattern

多語系訊息屬於 **Presentation 層的 Port**，透過 Message Service Pattern 保持：
- 分層清晰
- 類型安全
- 可測試

---

### 6) 測試策略與分層

測試分為：
- `Unit`（Domain / Application）
- `Integration`（Repository + DB）
- `Functional`（完整流程）
- `E2E`（Playwright）

此結構可對應 DDD 各層，讓測試與架構一致。

---

## 🚀 再利用流程（每個新專案一個 repo）

### Step 1) 建立新專案

```bash
# 方式 A: 直接複製
cp -R <template-repo> my-app
cd my-app

# 方式 B: 使用 git template
# (依團隊流程決定)
```

---

### Step 2) 重新命名與識別

建議至少調整：
- `package.json` 的 `name`、`description`
- `README.md` 的專案名稱與說明
- `.env` / `.env.example` 的服務名稱與連線設定

---

### Step 3) 清理示例模組（可選）

若不保留示例：
- 刪除不需要的 `app/Modules/*` 模組
- 同時移除對應測試（`tests/**`）

> 由於採 Auto-Wiring，**刪除模組即可停止載入**，不需手動註冊。

建議做法：
- 保留一個最小模組作為參考（例如 `User`），或改名為 `Example`

---

### Step 4) 建立你的第一個模組

```bash
bun run generate:module Product
# 或
bun gravito module generate Product --ddd-type simple
```

系統會自動產生：
- `Domain / Application / Infrastructure / Presentation`
- `index.ts` 模組定義
- 可直接被 Auto-Wiring 掃描

---

### Step 5) 啟動與驗證

```bash
# 開發推薦
ORM=memory bun run dev

# 基本驗證
bun run test
bun run typecheck
```

---

## ✅ 最小可行落地路徑 (MVP)

1. 使用 `ORM=memory` 啟動
2. 建立 1 個 CRUD 模組
3. 接入 HTTP 路由並完成測試
4. 有需要再切換 DB / ORM / Event / I18N

---

## 📌 常見注意事項

- Domain 層不可依賴 ORM / Framework / 外部 API
- Repository 介面只能存在於 Domain
- Infrastructure 只負責「實作」並依賴 Domain
- 模組入口只要符合 `index.ts + XxxModule` 即可自動接線

---

## 📚 延伸閱讀

- `docs/02-Architecture/CORE_DESIGN.md`
- `docs/02-Architecture/EVENT_SYSTEM.md`
- `docs/05-Database-ORM/ORM_GUIDE.md`
- `docs/04-Module-Development/DEVELOPMENT_GUIDE.md`

最後更新: 2026-03-16
