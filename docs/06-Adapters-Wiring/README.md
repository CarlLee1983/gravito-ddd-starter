# 🔌 適配器 & 接線層 (Adapters & Wiring)

框架整合層：將領域模型與 Gravito 框架及外部基礎設施進行無感連接。

---

## 📋 本分類包含

| 文檔 | 重點 |
| :--- | :--- |
| **[ADAPTER_GUIDE.md](./ADAPTER_GUIDE.md)** | ⭐ **必讀**: 適配器架構、Port 分類與最佳實踐。 |
| **[WIRING_SYSTEM.md](./WIRING_SYSTEM.md)** | 自動裝配: `ModuleAutoWirer` 與 `IModuleDefinition` 運作原理。 |
| **[WIRING_QUICK_REFERENCE.md](./WIRING_QUICK_REFERENCE.md)** | 快速參考: Repository 註冊與 ServiceProvider 範本。 |
| **[SMART_FACTORY_OPTIMIZATION.md](./SMART_FACTORY_OPTIMIZATION.md)** | 進階: 使用工廠生成器消除重複的裝配代碼。 |
| **[ADAPTER_INTEGRATION_EXAMPLES.md](./ADAPTER_INTEGRATION_EXAMPLES.md)** | 實戰: 整合 Redis、Cache 與資料庫的完整範例。 |
| **[REDIS_PORT_CONFIGURATION.md](./REDIS_PORT_CONFIGURATION.md)** | 配置: 處理本地與 Docker Redis 端口衝突。 |

---

## 🎯 核心願景：技術無感知

接線層 (Wiring Layer) 的存在是為了讓 **業務模組 (Modules)** 完全不需要知道：
- 資料庫是用 Drizzle 還是 Atlas。
- 快取是用 Redis 還是 Memory。
- 路由是用 Gravito 還是其他框架。

所有的「技術決策」都封裝在適配器中，並在啟動時透過自動裝配機制注入到模組內。

---

## 💡 推薦閱讀順序

1.  **[ADAPTER_GUIDE.md](./ADAPTER_GUIDE.md)**: 理解 Port 與 Adapter 的解耦邏輯。
2.  **[WIRING_SYSTEM.md](./WIRING_SYSTEM.md)**: 學習如何讓你的模組被系統自動識別。
3.  **[WIRING_QUICK_REFERENCE.md](./WIRING_QUICK_REFERENCE.md)**: 當你需要寫代碼時，直接複製這裡的範本。

---

## ✅ 裝配層檢查清單

當你新增一個模組時，確保：
- [ ] 在 `app/Modules/<Name>/index.ts` 導出了符合契約的 `XxxModule`。
- [ ] Repository 的註冊使用了 `createRepositoryFactory` 以保持代碼簡潔。
- [ ] 所有依賴關係都透過建構函式注入，而非直接 `new` 實例。

最後更新: 2026-03-13
